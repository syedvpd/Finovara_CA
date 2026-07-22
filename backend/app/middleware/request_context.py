"""Request correlation ids and structured access logging."""

from __future__ import annotations

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from app.core.logging import get_logger, request_id_ctx, user_id_ctx

logger = get_logger("api.access")

REQUEST_ID_HEADER = "X-Request-ID"

# Health probes would otherwise dominate the log volume.
_QUIET_PATHS = {"/health", "/health/live", "/health/ready", "/metrics", "/favicon.ico"}


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Assigns a request id, exposes it on the response, and logs the outcome."""

    def __init__(self, app: ASGIApp, *, slow_request_ms: int = 2000) -> None:
        super().__init__(app)
        self.slow_request_ms = slow_request_ms

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        incoming = request.headers.get(REQUEST_ID_HEADER)
        # An inbound value is only a correlation hint; never trust its format.
        request_id = incoming if incoming and len(incoming) <= 64 else str(uuid.uuid4())

        token = request_id_ctx.set(request_id)
        user_token = user_id_ctx.set(None)
        request.state.request_id = request_id
        started = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - started) * 1000
            logger.exception(
                "request_failed",
                method=request.method,
                path=request.url.path,
                duration_ms=round(duration_ms, 2),
            )
            raise
        finally:
            request_id_ctx.reset(token)
            user_id_ctx.reset(user_token)

        duration_ms = (time.perf_counter() - started) * 1000
        response.headers[REQUEST_ID_HEADER] = request_id
        response.headers["Server-Timing"] = f"app;dur={duration_ms:.1f}"

        if request.url.path not in _QUIET_PATHS:
            log = logger.warning if duration_ms > self.slow_request_ms else logger.info
            log(
                "request_completed",
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration_ms=round(duration_ms, 2),
                client_ip=_client_ip(request),
            )

        return response


def _client_ip(request: Request) -> str | None:
    """Left-most X-Forwarded-For entry, falling back to the socket peer."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None
