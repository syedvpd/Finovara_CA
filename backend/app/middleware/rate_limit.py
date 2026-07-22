"""Redis-backed fixed-window rate limiting."""

from __future__ import annotations

import re
import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette import status
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

from app.core.config import settings
from app.core.exceptions import ErrorCode
from app.core.logging import get_logger
from app.core.redis import incr_with_expiry

logger = get_logger(__name__)

_UNITS = {"second": 1, "minute": 60, "hour": 3600, "day": 86400}
_RULE_RE = re.compile(r"^(\d+)\s*/\s*(second|minute|hour|day)$", re.IGNORECASE)

# Authentication endpoints get the stricter budget.
_AUTH_PATH_MARKERS = ("/auth/login", "/auth/otp", "/auth/forgot-password", "/auth/reset-password", "/auth/register")

_EXEMPT_PATHS = {"/health", "/health/live", "/health/ready", "/openapi.json", "/docs", "/redoc"}


def parse_rule(rule: str) -> tuple[int, int]:
    """'200/minute' -> (200, 60)."""
    match = _RULE_RE.match(rule.strip())
    if not match:
        raise ValueError(f"Invalid rate limit rule: {rule!r}")
    return int(match.group(1)), _UNITS[match.group(2).lower()]


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fixed-window counter keyed by authenticated user, else client IP.

    Reads fail open: if Redis is unreachable a listing request proceeds rather
    than taking the whole API down with it. Authentication does not get that
    courtesy — an unreachable limiter there means unlimited credential
    guessing, so those paths fail closed and return 503.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)
        self.default_limit, self.default_window = parse_rule(settings.rate_limit_default)
        self.auth_limit, self.auth_window = parse_rule(settings.rate_limit_auth)

    def _identity(self, request: Request) -> str:
        # Prefer the verified subject once auth has run; before that, the IP.
        if user_id := getattr(request.state, "user_id", None):
            return f"user:{user_id}"
        forwarded = request.headers.get("X-Forwarded-For")
        ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
        return f"ip:{ip}"

    def _budget(self, path: str) -> tuple[int, int, str]:
        if any(marker in path for marker in _AUTH_PATH_MARKERS):
            return self.auth_limit, self.auth_window, "auth"
        return self.default_limit, self.default_window, "default"

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not settings.rate_limit_enabled or request.url.path in _EXEMPT_PATHS:
            return await call_next(request)

        limit, window, bucket = self._budget(request.url.path)
        identity = self._identity(request)
        window_start = int(time.time()) // window
        key = f"fv:ratelimit:{bucket}:{identity}:{window_start}"

        try:
            count = await incr_with_expiry(key, window)
        except Exception as exc:  # noqa: BLE001 - availability over enforcement
            logger.warning("rate_limit_backend_unavailable", error=str(exc), bucket=bucket)
            if bucket == "auth":
                return JSONResponse(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    content={
                        "success": False,
                        "error": {
                            "code": ErrorCode.DEPENDENCY_UNAVAILABLE,
                            "message": "Sign-in is temporarily unavailable. Please try again shortly.",
                        },
                        "request_id": getattr(request.state, "request_id", None),
                    },
                )
            return await call_next(request)

        reset_at = (window_start + 1) * window
        remaining = max(0, limit - count)

        if count > limit:
            retry_after = max(1, reset_at - int(time.time()))
            logger.warning(
                "rate_limit_exceeded",
                identity=identity,
                path=request.url.path,
                bucket=bucket,
                count=count,
                limit=limit,
            )
            return JSONResponse(
                status_code=429,
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_at),
                },
                content={
                    "success": False,
                    "error": {
                        "code": ErrorCode.RATE_LIMITED,
                        "message": "Too many requests. Please retry shortly.",
                    },
                    "request_id": getattr(request.state, "request_id", None),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_at)
        return response
