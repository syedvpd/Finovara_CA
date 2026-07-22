"""Structured logging with request-scoped correlation ids."""

from __future__ import annotations

import contextvars
import logging
import sys
from typing import Any

import structlog

from app.core.config import settings

request_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("request_id", default=None)
user_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("user_id", default=None)

# Never let these reach a log sink, whatever the nesting.
_REDACTED_KEYS = {
    "password", "new_password", "current_password", "token", "access_token",
    "refresh_token", "authorization", "cookie", "set-cookie", "secret",
    "api_key", "service_role_key", "jwt_secret", "otp", "pan", "aadhaar",
    "bank_account_no", "card", "cvv",
}


def _bind_context(_logger: Any, _name: str, event_dict: dict[str, Any]) -> dict[str, Any]:
    if rid := request_id_ctx.get():
        event_dict.setdefault("request_id", rid)
    if uid := user_id_ctx.get():
        event_dict.setdefault("user_id", uid)
    return event_dict


def _redact(_logger: Any, _name: str, event_dict: dict[str, Any]) -> dict[str, Any]:
    def scrub(value: Any) -> Any:
        if isinstance(value, dict):
            return {
                k: ("[redacted]" if k.lower() in _REDACTED_KEYS else scrub(v))
                for k, v in value.items()
            }
        if isinstance(value, (list, tuple)):
            return [scrub(v) for v in value]
        return value

    return scrub(event_dict)  # type: ignore[return-value]


def _colors_supported() -> bool:
    """structlog's coloured renderer needs colorama on Windows, and a TTY anywhere."""
    if not sys.stdout.isatty():
        return False
    if sys.platform == "win32":
        try:
            import colorama  # noqa: F401
        except ImportError:
            return False
    return True


def configure_logging() -> None:
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level, logging.INFO),
    )
    for noisy in ("uvicorn.access", "sqlalchemy.engine.Engine"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    renderer: Any = (
        structlog.processors.JSONRenderer()
        if (settings.log_json or settings.is_production)
        else structlog.dev.ConsoleRenderer(colors=_colors_supported())
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            _bind_context,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            _redact,
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.log_level, logging.INFO)
        ),
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)  # type: ignore[no-any-return]
