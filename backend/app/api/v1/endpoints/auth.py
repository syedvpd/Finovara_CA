"""Session endpoints.

Supabase authenticates the user and issues the tokens. This layer exchanges
those tokens for HTTP-only cookies, so the access token never has to be stored
in JavaScript-reachable storage, and records the login trail.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Request, Response, status

from app.api.deps import CurrentUser, DbSession, OptionalUser, resolve_identity
from app.core.config import settings
from app.core.exceptions import UnauthenticatedError
from app.core.logging import get_logger
from app.core.security import AuthContext, generate_csrf_token, hash_token, verify_token
from app.models.identity import LoginHistory, UserSession
from app.repositories.identity import UserRepository
from app.schemas.common import APIModel, MessageResponse, SuccessResponse
from app.schemas.identity import SessionInfo, UserRead, UserUpdate
from app.services.auth_security import AuthPolicyService, RequestContext, SupabaseAuthAdmin
from app.services.identity import user_service

logger = get_logger(__name__)
router = APIRouter()


class SessionExchange(APIModel):
    """Tokens returned by Supabase Auth on the client side."""

    access_token: str
    refresh_token: str | None = None


def _session_info(auth: AuthContext) -> SessionInfo:
    return SessionInfo(
        user_id=auth.user_id,
        email=auth.email,
        role=auth.role.value,
        permissions=sorted(auth.permissions),
        branch_id=auth.branch_id,
        client_id=auth.client_id,
        employee_id=auth.employee_id,
        is_staff=auth.is_staff,
        is_admin=auth.is_admin,
        expires_at=auth.expires_at,
    )


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str | None, csrf: str) -> None:
    common = {
        "domain": settings.cookie_domain or None,
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "path": "/",
    }
    response.set_cookie(
        settings.access_token_cookie, access_token,
        httponly=True, max_age=settings.access_token_ttl_seconds, **common,
    )
    if refresh_token:
        response.set_cookie(
            settings.refresh_token_cookie, refresh_token,
            httponly=True, max_age=settings.refresh_token_ttl_seconds, **common,
        )
    # Readable by JavaScript on purpose: the client echoes it back in a header
    # for the double-submit check. It is not a credential on its own.
    response.set_cookie(
        settings.csrf_cookie, csrf,
        httponly=False, max_age=settings.refresh_token_ttl_seconds, **common,
    )


def _clear_auth_cookies(response: Response) -> None:
    for name in (settings.access_token_cookie, settings.refresh_token_cookie, settings.csrf_cookie):
        response.delete_cookie(name, domain=settings.cookie_domain or None, path="/")


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post(
    "/session",
    response_model=SuccessResponse[SessionInfo],
    status_code=status.HTTP_201_CREATED,
    summary="Exchange Supabase tokens for a cookie session",
)
async def create_session(
    request: Request, response: Response, payload: SessionExchange, session: DbSession
) -> SuccessResponse[SessionInfo]:
    policy = AuthPolicyService(session)
    context = RequestContext(
        ip_address=_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        fingerprint=request.headers.get("X-Device-Fingerprint"),
    )

    # Verifying here means an invalid token never becomes a cookie.
    try:
        auth = verify_token(payload.access_token)
    except Exception:
        await policy.record_event(
            "session.rejected", severity="warning", context=context, reason="invalid_token"
        )
        raise

    # The token proves identity only. Resolve the role and profile ids from the
    # database, exactly as the request dependencies do — otherwise this
    # response reports the fallback 'client' role and the frontend routes a
    # staff member to the client portal.
    if not auth.claims_resolved:
        role, branch_id, client_id, employee_id = await resolve_identity(session, auth.user_id)
        auth.role, auth.branch_id = role, branch_id
        auth.client_id, auth.employee_id = client_id, employee_id
        auth.claims_resolved = True

    email = (auth.email or "").lower()

    # A locked account must not be able to establish a session even if it
    # somehow obtained a valid token.
    if email:
        await policy.assert_not_locked(email)

    now = datetime.now(timezone.utc)
    csrf = generate_csrf_token()
    _set_auth_cookies(response, payload.access_token, payload.refresh_token, csrf)

    device, is_new_device = await policy.register_device(auth.user_id, context)

    session.add(
        LoginHistory(
            user_id=auth.user_id,
            ip_address=context.ip_address,
            user_agent=context.user_agent,
            device_info={
                "session_id": auth.session_id,
                "device_id": str(device.id),
                "browser": device.browser,
                "os": device.operating_system,
                "new_device": is_new_device,
            },
            logged_in_at=now,
        )
    )

    absolute_hours = int(await policy.setting("auth.session_absolute_hours") or 12)
    if payload.refresh_token:
        # Store only a hash; a leaked table must not yield usable tokens.
        session.add(
            UserSession(
                user_id=auth.user_id,
                token_hash=hash_token(payload.refresh_token),
                expires_at=auth.expires_at or now,
                created_at=now,
                last_active_at=now,
                device_id=device.id,
                ip_address=context.ip_address,
                user_agent=context.user_agent,
                absolute_expires_at=now + timedelta(hours=absolute_hours),
            )
        )

    if email:
        await policy.record_attempt(email, successful=True, context=context, user_id=auth.user_id)
    await session.flush()

    logger.info(
        "session_established",
        user_id=str(auth.user_id), role=auth.role.value, new_device=is_new_device,
    )
    return SuccessResponse[SessionInfo](
        data=_session_info(auth), request_id=getattr(request.state, "request_id", None)
    )


@router.get(
    "/session",
    response_model=SuccessResponse[SessionInfo],
    summary="Current session, role, and effective permissions",
)
async def read_session(request: Request, auth: CurrentUser) -> SuccessResponse[SessionInfo]:
    return SuccessResponse[SessionInfo](
        data=_session_info(auth), request_id=getattr(request.state, "request_id", None)
    )


@router.post("/session/refresh", response_model=SuccessResponse[SessionInfo], summary="Rotate the session cookie")
async def refresh_session(
    request: Request, response: Response, payload: SessionExchange
) -> SuccessResponse[SessionInfo]:
    """Re-issue cookies from a freshly minted Supabase access token."""
    auth = verify_token(payload.access_token)
    csrf = generate_csrf_token()
    _set_auth_cookies(response, payload.access_token, payload.refresh_token, csrf)
    return SuccessResponse[SessionInfo](
        data=_session_info(auth), request_id=getattr(request.state, "request_id", None)
    )


@router.delete("/session", response_model=MessageResponse, summary="Sign out of this device")
async def destroy_session(
    request: Request, response: Response, session: DbSession, auth: OptionalUser
) -> MessageResponse:
    _clear_auth_cookies(response)
    if auth is not None:
        logger.info("session_destroyed", user_id=str(auth.user_id))
    return MessageResponse(message="Signed out.", request_id=getattr(request.state, "request_id", None))


@router.delete("/sessions", response_model=MessageResponse, summary="Sign out of every device")
async def destroy_all_sessions(
    request: Request, response: Response, session: DbSession, auth: CurrentUser
) -> MessageResponse:
    from sqlalchemy import delete

    await session.execute(delete(UserSession).where(UserSession.user_id == auth.user_id))
    # Local revocation alone leaves the Supabase refresh token usable.
    await SupabaseAuthAdmin().sign_out_everywhere(auth.user_id)
    _clear_auth_cookies(response)
    logger.info("all_sessions_destroyed", user_id=str(auth.user_id))
    return MessageResponse(
        message="Signed out of all devices.", request_id=getattr(request.state, "request_id", None)
    )


@router.get("/me", response_model=SuccessResponse[UserRead], summary="Current user profile")
async def read_me(request: Request, session: DbSession, auth: CurrentUser) -> SuccessResponse[UserRead]:
    user = await user_service(session).get_self(auth)
    return SuccessResponse[UserRead](
        data=UserRead.model_validate(user), request_id=getattr(request.state, "request_id", None)
    )


@router.patch("/me", response_model=SuccessResponse[UserRead], summary="Update own profile")
async def update_me(
    request: Request, payload: UserUpdate, session: DbSession, auth: CurrentUser
) -> SuccessResponse[UserRead]:
    user = await user_service(session).update_self(payload.model_dump(exclude_unset=True), auth)
    return SuccessResponse[UserRead](
        data=UserRead.model_validate(user), request_id=getattr(request.state, "request_id", None)
    )
