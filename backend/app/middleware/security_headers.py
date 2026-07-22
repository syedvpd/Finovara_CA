"""Security response headers and body-size enforcement."""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

from app.core.config import settings
from app.core.exceptions import ErrorCode

# Swagger UI needs inline styles and its CDN bundle; the API itself serves no
# HTML, so the policy is otherwise maximally restrictive.
_API_CSP = (
    "default-src 'none'; "
    "frame-ancestors 'none'; "
    "base-uri 'none'; "
    "form-action 'none'"
)
_DOCS_CSP = (
    "default-src 'self'; "
    "img-src 'self' data: https://fastapi.tiangolo.com; "
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "frame-ancestors 'none'; "
    "base-uri 'self'"
)

_DOC_PATHS = ("/docs", "/redoc", "/openapi.json")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        is_docs = request.url.path.startswith(_DOC_PATHS)

        response.headers.setdefault("Content-Security-Policy", _DOCS_CSP if is_docs else _API_CSP)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
        )
        response.headers.setdefault("Cache-Control", "no-store")
        # Do not advertise the stack. MutableHeaders has no pop(); delete by key.
        for header in ("Server", "X-Powered-By"):
            if header in response.headers:
                del response.headers[header]

        if settings.is_production:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"
            )

        return response


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Rejects oversized uploads before they are buffered."""

    def __init__(self, app: ASGIApp, max_bytes: int | None = None) -> None:
        super().__init__(app)
        self.max_bytes = max_bytes or settings.max_upload_bytes

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        content_length = request.headers.get("content-length")
        if content_length and content_length.isdigit() and int(content_length) > self.max_bytes:
            return JSONResponse(
                status_code=413,
                content={
                    "success": False,
                    "error": {
                        "code": ErrorCode.PAYLOAD_TOO_LARGE,
                        "message": f"Request body exceeds the {self.max_bytes} byte limit.",
                    },
                    "request_id": getattr(request.state, "request_id", None),
                },
            )
        return await call_next(request)
