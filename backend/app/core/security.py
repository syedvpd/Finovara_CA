"""Token verification, CSRF, and password hashing.

Supabase issues the tokens; this module verifies them. It never mints an
access token of its own, so Supabase Auth stays the single identity authority.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jwt import PyJWKClient

from app.core.config import settings
from app.core.exceptions import InvalidTokenError, TokenExpiredError
from app.core.permissions import Role, has_permission, is_admin, is_staff, permissions_for

_password_hasher = PasswordHasher()

# JWKS is fetched lazily and cached; only used for asymmetric Supabase projects.
_jwk_client: PyJWKClient | None = None


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient(settings.supabase_jwks_url, cache_keys=True, lifespan=3600)
    return _jwk_client


@dataclass(slots=True)
class AuthContext:
    """The verified identity behind the current request."""

    user_id: UUID
    email: str | None
    role: Role
    session_id: str | None = None
    branch_id: UUID | None = None
    client_id: UUID | None = None
    employee_id: UUID | None = None
    issued_at: datetime | None = None
    expires_at: datetime | None = None
    raw_claims: dict[str, Any] = field(default_factory=dict)
    #: False when the access-token hook did not inject application claims, so
    #: the role and profile ids must be resolved from the database instead.
    claims_resolved: bool = True

    @property
    def is_staff(self) -> bool:
        return is_staff(self.role)

    @property
    def is_admin(self) -> bool:
        return is_admin(self.role)

    @property
    def is_client(self) -> bool:
        return self.role == Role.CLIENT

    @property
    def permissions(self) -> frozenset[str]:
        return permissions_for(self.role)

    def can(self, permission: str) -> bool:
        return has_permission(self.role, permission)


def _as_uuid(value: Any) -> UUID | None:
    if value in (None, "", "null"):
        return None
    try:
        return UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        return None


def decode_token(token: str, *, verify_expiry: bool = True) -> dict[str, Any]:
    """Verify a Supabase-issued JWT and return its claims."""
    if not token:
        raise InvalidTokenError()

    algorithm = settings.supabase_jwt_algorithm.upper()
    options = {
        "verify_signature": True,
        "verify_exp": verify_expiry,
        "verify_aud": bool(settings.supabase_jwt_audience),
        # `iat` is informational and trips on a locally slow clock against a
        # token Supabase has only just minted. Expiry stays strict: leeway on
        # `exp` would accept dead tokens, and PyJWT applies leeway to both.
        "verify_iat": False,
        "require": ["exp", "sub"],
    }

    try:
        if algorithm.startswith("HS"):
            if not settings.supabase_jwt_secret:
                raise InvalidTokenError("Token verification is not configured.")
            key: Any = settings.supabase_jwt_secret
        else:
            key = _get_jwk_client().get_signing_key_from_jwt(token).key

        return jwt.decode(
            token,
            key,
            algorithms=[algorithm],
            audience=settings.supabase_jwt_audience or None,
            options=options,
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenExpiredError() from exc
    except jwt.InvalidTokenError as exc:
        # Never leak the parser's reason to the caller.
        raise InvalidTokenError() from exc


def build_auth_context(claims: dict[str, Any]) -> AuthContext:
    """Translate verified JWT claims into an ``AuthContext``.

    The custom access token hook injects ``role`` plus ``user_metadata`` keys
    (``branch_id``, ``client_id``, ``employee_id``).
    """
    user_id = _as_uuid(claims.get("sub"))
    if user_id is None:
        raise InvalidTokenError()

    metadata = claims.get("user_metadata") or {}
    raw_role = claims.get("role") or metadata.get("role")

    # 'authenticated' is Postgres' own role claim, not an application role.
    # Its presence without a metadata role means the custom access token hook
    # is not injecting claims, so authorization must be resolved from the
    # database rather than assumed.
    claims_resolved = True
    if raw_role in (None, "authenticated", "anon", "service_role"):
        raw_role = metadata.get("role")
        if raw_role is None:
            raw_role = Role.CLIENT.value
            claims_resolved = False

    try:
        role = Role(raw_role)
    except ValueError as exc:
        raise InvalidTokenError() from exc

    def _ts(key: str) -> datetime | None:
        value = claims.get(key)
        return datetime.fromtimestamp(value, tz=timezone.utc) if isinstance(value, (int, float)) else None

    return AuthContext(
        user_id=user_id,
        email=claims.get("email"),
        role=role,
        session_id=claims.get("session_id"),
        branch_id=_as_uuid(metadata.get("branch_id")),
        client_id=_as_uuid(metadata.get("client_id")),
        employee_id=_as_uuid(metadata.get("employee_id")),
        issued_at=_ts("iat"),
        expires_at=_ts("exp"),
        raw_claims=claims,
        claims_resolved=claims_resolved,
    )


def verify_token(token: str) -> AuthContext:
    return build_auth_context(decode_token(token))


# --- CSRF (double-submit cookie) --------------------------------------------

def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def verify_csrf(cookie_value: str | None, header_value: str | None) -> bool:
    if not cookie_value or not header_value:
        return False
    return hmac.compare_digest(cookie_value, header_value)


# --- Opaque token hashing (refresh tokens, session records) ------------------

def hash_token(token: str) -> str:
    """SHA-256 for high-entropy random tokens — never for user passwords."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_opaque_token(nbytes: int = 48) -> str:
    return secrets.token_urlsafe(nbytes)


# --- Password hashing --------------------------------------------------------

def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, Exception):  # noqa: B014 - argon2 raises several types
        return False


def password_needs_rehash(password_hash: str) -> bool:
    return _password_hasher.check_needs_rehash(password_hash)
