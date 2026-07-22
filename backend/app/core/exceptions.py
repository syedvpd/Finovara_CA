"""Application error model.

Every failure leaving the API is an ``AppError`` carrying a stable, machine
readable ``code``. Internal detail never reaches the client.
"""

from __future__ import annotations

from typing import Any


class ErrorCode:
    """Stable error codes. Clients branch on these, not on messages."""

    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNAUTHENTICATED = "UNAUTHENTICATED"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    SESSION_EXPIRED = "SESSION_EXPIRED"
    FORBIDDEN = "FORBIDDEN"
    CSRF_FAILED = "CSRF_FAILED"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    ALREADY_EXISTS = "ALREADY_EXISTS"
    INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION"
    RATE_LIMITED = "RATE_LIMITED"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
    PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE"
    UNSUPPORTED_MEDIA_TYPE = "UNSUPPORTED_MEDIA_TYPE"
    DEPENDENCY_UNAVAILABLE = "DEPENDENCY_UNAVAILABLE"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class AppError(Exception):
    """Base class for every expected failure."""

    status_code: int = 500
    code: str = ErrorCode.INTERNAL_ERROR
    message: str = "An unexpected error occurred."

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        status_code: int | None = None,
        details: Any = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.message = message or self.message
        self.code = code or self.code
        self.status_code = status_code or self.status_code
        self.details = details
        self.headers = headers or {}
        super().__init__(self.message)

    def to_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.details is not None:
            payload["details"] = self.details
        return payload


class ValidationError(AppError):
    status_code = 422
    code = ErrorCode.VALIDATION_ERROR
    message = "The request payload failed validation."


class UnauthenticatedError(AppError):
    status_code = 401
    code = ErrorCode.UNAUTHENTICATED
    message = "Authentication is required."


class InvalidTokenError(UnauthenticatedError):
    code = ErrorCode.INVALID_TOKEN
    message = "The credentials provided are not valid."


class TokenExpiredError(UnauthenticatedError):
    code = ErrorCode.TOKEN_EXPIRED
    message = "The session token has expired."


class SessionExpiredError(UnauthenticatedError):
    code = ErrorCode.SESSION_EXPIRED
    message = "The session has expired. Please sign in again."


class ForbiddenError(AppError):
    status_code = 403
    code = ErrorCode.FORBIDDEN
    message = "You do not have permission to perform this action."


class CsrfError(AppError):
    status_code = 403
    code = ErrorCode.CSRF_FAILED
    message = "CSRF validation failed."


class NotFoundError(AppError):
    status_code = 404
    code = ErrorCode.NOT_FOUND
    message = "The requested resource was not found."

    def __init__(self, resource: str = "Resource", identifier: Any = None, **kw: Any) -> None:
        msg = f"{resource} not found." if identifier is None else f"{resource} '{identifier}' not found."
        super().__init__(msg, **kw)


class ConflictError(AppError):
    status_code = 409
    code = ErrorCode.CONFLICT
    message = "The request conflicts with the current state of the resource."


class AlreadyExistsError(ConflictError):
    code = ErrorCode.ALREADY_EXISTS
    message = "A resource with these details already exists."


class InvalidStateTransitionError(ConflictError):
    code = ErrorCode.INVALID_STATE_TRANSITION

    def __init__(self, entity: str, current: str, target: str, **kw: Any) -> None:
        super().__init__(
            f"{entity} cannot move from '{current}' to '{target}'.",
            details={"current_status": current, "requested_status": target},
            **kw,
        )


class RateLimitedError(AppError):
    status_code = 429
    code = ErrorCode.RATE_LIMITED
    message = "Too many requests. Please slow down."


class AccountLockedError(AppError):
    status_code = 423
    code = ErrorCode.ACCOUNT_LOCKED
    message = "This account is temporarily locked due to repeated failed sign-in attempts."


class PayloadTooLargeError(AppError):
    status_code = 413
    code = ErrorCode.PAYLOAD_TOO_LARGE
    message = "The uploaded file exceeds the maximum permitted size."


class UnsupportedMediaTypeError(AppError):
    status_code = 415
    code = ErrorCode.UNSUPPORTED_MEDIA_TYPE
    message = "This file type is not accepted."


class DependencyUnavailableError(AppError):
    status_code = 503
    code = ErrorCode.DEPENDENCY_UNAVAILABLE
    message = "A required downstream service is unavailable."
