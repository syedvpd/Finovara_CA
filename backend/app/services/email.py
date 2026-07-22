"""Email delivery via Brevo (Sendinblue) – SMTP relay or Transactional API.

Priority:
  1. Brevo Transactional API  – when BREVO_API_KEY is set (recommended).
  2. Brevo SMTP Relay          – when SMTP_HOST / SMTP_USER / SMTP_PASSWORD are set.

Isolated behind one interface so the transport can be swapped without
touching the notification worker.
"""

from __future__ import annotations

import asyncio
import smtplib
import ssl
from dataclasses import dataclass, field
from email.message import EmailMessage
from email.utils import make_msgid
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Brevo Transactional API endpoint
# ---------------------------------------------------------------------------
_BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"


# ---------------------------------------------------------------------------
# Public types
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class Attachment:
    filename: str
    content: bytes
    mime_type: str = "application/pdf"


class EmailNotConfiguredError(RuntimeError):
    """Raised when neither Brevo API nor SMTP has been configured."""


# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------


def _brevo_api_configured() -> bool:
    """Return True if the Brevo transactional API can be used."""
    return bool(settings.brevo_api_key and settings.brevo_sender_email)


def _smtp_configured() -> bool:
    """Return True if Brevo SMTP relay (or any SMTP) is configured."""
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)


def is_configured() -> bool:
    """Return True if any email transport is available."""
    return _brevo_api_configured() or _smtp_configured()


# ---------------------------------------------------------------------------
# Brevo Transactional API transport
# ---------------------------------------------------------------------------


async def _send_via_brevo_api(
    to: str,
    subject: str,
    body: str,
    attachments: list[Attachment] | None = None,
) -> None:
    """Send via the Brevo v3 transactional API (async, no blocking thread)."""
    payload: dict[str, Any] = {
        "sender": {
            "name": settings.brevo_sender_name,
            "email": settings.brevo_sender_email,
        },
        "to": [{"email": to}],
        "subject": subject,
        "textContent": body,
    }

    if attachments:
        import base64

        payload["attachment"] = [
            {
                "name": att.filename,
                "content": base64.b64encode(att.content).decode(),
            }
            for att in attachments
        ]

    headers = {
        "api-key": settings.brevo_api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(_BREVO_SEND_URL, json=payload, headers=headers)
        response.raise_for_status()

    logger.info(
        "email_sent_brevo_api",
        to=to,
        subject=subject,
        attachments=len(attachments or []),
    )


# ---------------------------------------------------------------------------
# SMTP transport (Brevo relay or generic SMTP)
# ---------------------------------------------------------------------------


def _build_smtp_message(
    to: str, subject: str, body: str, attachments: list[Attachment] | None = None
) -> EmailMessage:
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message["Message-ID"] = make_msgid(domain="finovara.com")
    message["Auto-Submitted"] = "auto-generated"
    message.set_content(body)

    for attachment in attachments or []:
        maintype, _, subtype = attachment.mime_type.partition("/")
        message.add_attachment(
            attachment.content,
            maintype=maintype or "application",
            subtype=subtype or "octet-stream",
            filename=attachment.filename,
        )
    return message


def _send_smtp_blocking(message: EmailMessage) -> None:
    """Synchronous SMTP send – executed off the event loop by ``_send_via_smtp``."""
    context = ssl.create_default_context()

    if settings.smtp_port == 465:
        with smtplib.SMTP_SSL(
            settings.smtp_host, settings.smtp_port, context=context, timeout=30
        ) as server:
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(message)
        return

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
        server.ehlo()
        if settings.smtp_starttls:
            server.starttls(context=context)
            server.ehlo()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)


async def _send_via_smtp(
    to: str,
    subject: str,
    body: str,
    attachments: list[Attachment] | None = None,
) -> None:
    message = _build_smtp_message(to, subject, body, attachments)
    await asyncio.to_thread(_send_smtp_blocking, message)
    logger.info(
        "email_sent_smtp",
        to=to,
        subject=subject,
        attachments=len(attachments or []),
    )


# ---------------------------------------------------------------------------
# Public send interface
# ---------------------------------------------------------------------------


async def send(
    to: str,
    subject: str,
    body: str,
    attachments: list[Attachment] | None = None,
) -> None:
    """Deliver one email.

    Uses the Brevo Transactional API when ``BREVO_API_KEY`` is set; falls back
    to SMTP relay (Brevo or generic) otherwise. Raises on failure so the
    worker can retry.
    """
    if not is_configured():
        raise EmailNotConfiguredError(
            "Email is not configured. Set BREVO_API_KEY + BREVO_SENDER_EMAIL "
            "(preferred) or SMTP_HOST + SMTP_USER + SMTP_PASSWORD."
        )

    if _brevo_api_configured():
        await _send_via_brevo_api(to, subject, body, attachments)
    else:
        await _send_via_smtp(to, subject, body, attachments)
