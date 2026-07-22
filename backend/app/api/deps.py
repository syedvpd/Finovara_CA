"""Shared FastAPI dependencies: authentication, authorization, and DB access."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from time import monotonic
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import CsrfError, ForbiddenError, UnauthenticatedError
from app.core.logging import user_id_ctx
from app.core.permissions import Action, Module, Role, perm
from app.core.security import AuthContext, verify_csrf, verify_token
from app.db.session import attach_claims, get_db
from app.schemas.common import PaginationParams, SearchParams, SortParams, pagination_params, search_params, sort_params

# Methods that mutate state and therefore require a CSRF token when the caller
# authenticates via cookie rather than an Authorization header.
_UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _extract_token(request: Request) -> tuple[str | None, bool]:
    """Return (token, came_from_cookie).

    Bearer tokens are not subject to CSRF: they are not attached automatically
    by the browser, so the double-submit check only applies to cookie auth.
    """
    header = request.headers.get("Authorization", "")
    if header.lower().startswith("bearer "):
        token = header[7:].strip()
        if token:
            return token, False

    cookie = request.cookies.get(settings.access_token_cookie)
    return (cookie, True) if cookie else (None, False)


async def get_auth_context_optional(request: Request) -> AuthContext | None:
    """Verified identity, or ``None`` for anonymous callers."""
    token, from_cookie = _extract_token(request)
    if not token:
        return None

    auth = verify_token(token)

    if from_cookie and request.method in _UNSAFE_METHODS:
        if not verify_csrf(
            request.cookies.get(settings.csrf_cookie),
            request.headers.get(settings.csrf_header),
        ):
            raise CsrfError()

    request.state.auth = auth
    request.state.user_id = str(auth.user_id)
    user_id_ctx.set(str(auth.user_id))
    return auth


#: Resolved identities, keyed by user id. Short-lived: a role change must take
#: effect quickly, but re-querying on every request is wasteful.
_IDENTITY_TTL_SECONDS = 30
_identity_cache: dict[UUID, tuple[float, tuple[Role, UUID | None, UUID | None, UUID | None]]] = {}


async def _resolve_identity_from_db(session: AsyncSession, user_id: UUID) -> tuple[Role, UUID | None, UUID | None, UUID | None]:
    """Load role, branch, client and employee ids for a verified user.

    Used when the Supabase access-token hook is not injecting application
    claims. The database is the authority for authorization, so this is also
    the safer path: a stale JWT cannot carry a role the user no longer holds.
    """
    cached = _identity_cache.get(user_id)
    now = monotonic()
    if cached and now - cached[0] < _IDENTITY_TTL_SECONDS:
        return cached[1]

    row = (
        await session.execute(
            text(
                """
                select r.code            as role_code,
                       e.id              as employee_id,
                       c.id              as client_id,
                       coalesce(e.branch_id, c.branch_id) as branch_id
                  from public.users u
                  left join public.roles r     on r.id = u.role_id
                  left join public.employees e on e.user_id = u.id and e.deleted_at is null
                  left join public.clients   c on c.user_id = u.id and c.deleted_at is null
                 where u.id = :uid and u.deleted_at is null
                 limit 1
                """
            ),
            {"uid": str(user_id)},
        )
    ).mappings().first()

    if row is None:
        # Verified by Supabase but no profile row: treat as unprovisioned
        # rather than silently granting the default client role.
        raise ForbiddenError("This account has not been provisioned. Contact your administrator.")

    try:
        role = Role(row["role_code"]) if row["role_code"] else Role.CLIENT
    except ValueError:
        role = Role.CLIENT

    resolved = (role, row["branch_id"], row["client_id"], row["employee_id"])
    _identity_cache[user_id] = (now, resolved)
    return resolved


#: Public alias so endpoints outside the dependency chain can resolve identity.
resolve_identity = _resolve_identity_from_db


def invalidate_identity_cache(user_id: UUID | None = None) -> None:
    """Drop cached identities after a role or profile change."""
    if user_id is None:
        _identity_cache.clear()
    else:
        _identity_cache.pop(user_id, None)


async def get_auth_context(
    auth: Annotated[AuthContext | None, Depends(get_auth_context_optional)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AuthContext:
    if auth is None:
        raise UnauthenticatedError()

    # The token proves identity; the database decides what it may do. This runs
    # only when the access-token hook has not supplied the application claims.
    if not auth.claims_resolved:
        role, branch_id, client_id, employee_id = await _resolve_identity_from_db(session, auth.user_id)
        auth.role = role
        auth.branch_id = branch_id
        auth.client_id = client_id
        auth.employee_id = employee_id
        auth.claims_resolved = True
        user_id_ctx.set(str(auth.user_id))

    return auth


async def get_scoped_db(
    session: Annotated[AsyncSession, Depends(get_db)],
    auth: Annotated[AuthContext | None, Depends(get_auth_context_optional)],
) -> AsyncSession:
    """Session carrying the caller's claims.

    The claims are staged, not sent: they reach the database when a transaction
    actually begins. An endpoint that rejects on authorization or validation
    therefore never checks out a connection.
    """
    if auth is not None:
        attach_claims(session, auth.raw_claims)
    return session


# --- Authorization guards ----------------------------------------------------

def require_roles(*roles: Role) -> Callable[..., AuthContext]:
    allowed = frozenset(roles)

    async def _guard(auth: Annotated[AuthContext, Depends(get_auth_context)]) -> AuthContext:
        if auth.role not in allowed:
            raise ForbiddenError(
                "This action requires a different role.",
                details={"required_roles": sorted(r.value for r in allowed)},
            )
        return auth

    return _guard


def require_permission(module: Module, action: Action) -> Callable[..., AuthContext]:
    required = perm(module, action)

    async def _guard(auth: Annotated[AuthContext, Depends(get_auth_context)]) -> AuthContext:
        if not auth.can(required):
            raise ForbiddenError(
                "You do not have permission to perform this action.",
                details={"required_permission": required},
            )
        return auth

    return _guard


def require_any_permission(*permissions: str) -> Callable[..., AuthContext]:
    required = frozenset(permissions)

    async def _guard(auth: Annotated[AuthContext, Depends(get_auth_context)]) -> AuthContext:
        if not any(auth.can(p) for p in required):
            raise ForbiddenError(
                "You do not have permission to perform this action.",
                details={"required_any_of": sorted(required)},
            )
        return auth

    return _guard


async def require_staff(auth: Annotated[AuthContext, Depends(get_auth_context)]) -> AuthContext:
    if not auth.is_staff:
        raise ForbiddenError("This endpoint is restricted to firm personnel.")
    return auth


async def require_admin(auth: Annotated[AuthContext, Depends(get_auth_context)]) -> AuthContext:
    if not auth.is_admin:
        raise ForbiddenError("This endpoint is restricted to administrators.")
    return auth


async def require_client(auth: Annotated[AuthContext, Depends(get_auth_context)]) -> AuthContext:
    if not auth.is_client or auth.client_id is None:
        raise ForbiddenError("This endpoint is restricted to client accounts.")
    return auth


async def get_current_client_id(auth: Annotated[AuthContext, Depends(get_auth_context)]) -> UUID:
    if auth.client_id is None:
        raise ForbiddenError("No client profile is linked to this account.")
    return auth.client_id


async def get_current_employee_id(auth: Annotated[AuthContext, Depends(get_auth_context)]) -> UUID:
    if auth.employee_id is None:
        raise ForbiddenError("No employee profile is linked to this account.")
    return auth.employee_id


def resolve_client_scope(auth: AuthContext, requested_client_id: UUID | None) -> UUID | None:
    """Collapse a client filter to what the caller is actually allowed to see.

    A client account is always pinned to its own id regardless of what it asks
    for; staff may filter freely and branch scoping is applied in the repository.
    """
    if auth.is_client:
        if requested_client_id is not None and requested_client_id != auth.client_id:
            raise ForbiddenError("You may only access your own records.")
        return auth.client_id
    return requested_client_id


def assert_can_access_client(auth: AuthContext, client_id: UUID | None) -> None:
    if auth.is_client and client_id != auth.client_id:
        raise ForbiddenError("You may only access your own records.")


# --- Convenience aliases -----------------------------------------------------

DbSession = Annotated[AsyncSession, Depends(get_scoped_db)]
CurrentUser = Annotated[AuthContext, Depends(get_auth_context)]
OptionalUser = Annotated[AuthContext | None, Depends(get_auth_context_optional)]
StaffUser = Annotated[AuthContext, Depends(require_staff)]
AdminUser = Annotated[AuthContext, Depends(require_admin)]
ClientUser = Annotated[AuthContext, Depends(require_client)]
Pagination = Annotated[PaginationParams, Depends(pagination_params)]
Sorting = Annotated[SortParams, Depends(sort_params)]
Searching = Annotated[SearchParams, Depends(search_params)]


def branch_scope(auth: AuthContext) -> Sequence[UUID]:
    """Branches the caller may read. Empty tuple means unrestricted."""
    if auth.is_admin:
        return ()
    return (auth.branch_id,) if auth.branch_id else ()
