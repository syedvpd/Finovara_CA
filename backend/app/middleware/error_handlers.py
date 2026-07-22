"""Global exception handlers producing the standard error envelope."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppError, ErrorCode
from app.core.logging import get_logger

logger = get_logger("api.error")


def _envelope(
    request: Request,
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    error: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        error["details"] = details
    return JSONResponse(
        status_code=status_code,
        headers=headers,
        content={
            "success": False,
            "error": error,
            "request_id": getattr(request.state, "request_id", None),
        },
    )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    if exc.status_code >= 500:
        logger.error("app_error", code=exc.code, message=exc.message, path=request.url.path)
    else:
        logger.info("app_error", code=exc.code, status_code=exc.status_code, path=request.url.path)
    return _envelope(request, exc.status_code, exc.code, exc.message, exc.details, exc.headers or None)


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = {
        401: ErrorCode.UNAUTHENTICATED,
        403: ErrorCode.FORBIDDEN,
        404: ErrorCode.NOT_FOUND,
        409: ErrorCode.CONFLICT,
        413: ErrorCode.PAYLOAD_TOO_LARGE,
        415: ErrorCode.UNSUPPORTED_MEDIA_TYPE,
        429: ErrorCode.RATE_LIMITED,
    }.get(exc.status_code, ErrorCode.INTERNAL_ERROR if exc.status_code >= 500 else "HTTP_ERROR")

    detail = exc.detail if isinstance(exc.detail, str) else "Request could not be processed."
    headers = dict(exc.headers) if exc.headers else None
    return _envelope(request, exc.status_code, code, detail, headers=headers)


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {
            "field": ".".join(str(part) for part in err.get("loc", ()) if part != "body"),
            "message": err.get("msg", "Invalid value"),
            "type": err.get("type"),
        }
        for err in exc.errors()
    ]
    return _envelope(
        request, 422, ErrorCode.VALIDATION_ERROR, "The request payload failed validation.", details
    )


async def pydantic_validation_handler(request: Request, exc: PydanticValidationError) -> JSONResponse:
    # A response model failing to serialise is a server-side bug, not the caller's fault.
    logger.error("response_validation_failed", path=request.url.path, errors=exc.errors())
    return _envelope(
        request, 500, ErrorCode.INTERNAL_ERROR, "The server produced an invalid response."
    )


async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    raw = str(getattr(exc, "orig", exc))
    logger.warning("integrity_error", path=request.url.path, error=raw)

    lowered = raw.lower()
    if "unique" in lowered or "duplicate key" in lowered:
        return _envelope(
            request, 409, ErrorCode.ALREADY_EXISTS,
            "A record with these details already exists.",
        )
    if "foreign key" in lowered:
        return _envelope(
            request, 409, ErrorCode.CONFLICT,
            "The request references a record that does not exist, or one that is still in use.",
        )
    if "check constraint" in lowered or "violates check" in lowered:
        return _envelope(
            request, 422, ErrorCode.VALIDATION_ERROR,
            "One or more values are outside the permitted range.",
        )
    return _envelope(request, 409, ErrorCode.CONFLICT, "The request conflicts with existing data.")


async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    logger.exception("database_error", path=request.url.path)
    return _envelope(
        request, 503, ErrorCode.DEPENDENCY_UNAVAILABLE, "The database is temporarily unavailable."
    )


def _unwrap(exc: BaseException, depth: int = 0) -> BaseException:
    """Pull the meaningful error out of an ExceptionGroup.

    Starlette's BaseHTTPMiddleware runs the handler inside an anyio task group,
    so a failure surfaces wrapped in an ExceptionGroup. Without unwrapping,
    every such error is misreported as a generic 500.
    """
    if depth < 5 and isinstance(exc, BaseExceptionGroup) and exc.exceptions:
        return _unwrap(exc.exceptions[0], depth + 1)
    return exc


async def connection_error_handler(request: Request, exc: OSError) -> JSONResponse:
    """A refused or dropped socket means a dependency is down, not a bug."""
    logger.error("dependency_connection_failed", path=request.url.path, error=str(exc))
    return _envelope(
        request, 503, ErrorCode.DEPENDENCY_UNAVAILABLE,
        "A required service is temporarily unavailable. Please try again shortly.",
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    cause = _unwrap(exc)

    # Re-dispatch the unwrapped cause so it is classified properly rather than
    # collapsing every middleware-wrapped failure into a 500.
    if isinstance(cause, AppError):
        return await app_error_handler(request, cause)
    if isinstance(cause, IntegrityError):
        return await integrity_error_handler(request, cause)
    if isinstance(cause, (OSError, ConnectionError)):
        return await connection_error_handler(request, cause)
    if isinstance(cause, SQLAlchemyError):
        return await sqlalchemy_error_handler(request, cause)

    try:
        import asyncpg
        if isinstance(cause, (asyncpg.InterfaceError, asyncpg.PostgresError)):
            logger.exception("database_error", path=request.url.path)
            return _envelope(
                request, 503, ErrorCode.DEPENDENCY_UNAVAILABLE, "The database is temporarily unavailable."
            )
    except Exception:
        pass

    # Full stack goes to the log; the caller gets nothing but a correlation id.
    logger.exception("unhandled_exception", path=request.url.path, method=request.method)
    return _envelope(
        request, 500, ErrorCode.INTERNAL_ERROR,
        "An unexpected error occurred. Quote the request id when reporting this.",
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(PydanticValidationError, pydantic_validation_handler)  # type: ignore[arg-type]
    app.add_exception_handler(IntegrityError, integrity_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(OSError, connection_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)
