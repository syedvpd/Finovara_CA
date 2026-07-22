"""Notification dispatch worker.

Drains `public.notifications` where status='pending'. Rows are claimed with
`FOR UPDATE SKIP LOCKED`, so multiple workers can run without delivering the
same message twice.

Channel behaviour:
  email  — sent via Brevo Transactional API (or SMTP relay fallback); a send failure increments retry_count
  in_app — delivered by existing in the table; marked sent immediately
  sms / whatsapp / push — no provider configured, so they are parked as
           'failed' with a clear reason rather than silently dropped
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.content import Notification
from app.models.identity import User
from app.services import email as email_service
from app.workers.base import JobResult

logger = get_logger(__name__)

BATCH_SIZE = 50
MAX_ATTEMPTS = 5

#: Channels with no provider wired up yet.
UNSUPPORTED_CHANNELS = {"sms", "whatsapp", "push"}


def _backoff(attempt: int) -> timedelta:
    """Exponential backoff, capped — 1, 2, 4, 8, 16 minutes."""
    return timedelta(minutes=min(2 ** attempt, 16))


async def dispatch_pending(session: AsyncSession) -> JobResult:
    now = datetime.now(timezone.utc)

    claimed = (
        await session.execute(
            select(Notification)
            .where(
                Notification.status == "pending",
                (Notification.send_after.is_(None)) | (Notification.send_after <= now),
                Notification.retry_count < MAX_ATTEMPTS,
            )
            .order_by(Notification.created_at)
            .limit(BATCH_SIZE)
            .with_for_update(skip_locked=True)
        )
    ).scalars().all()

    if not claimed:
        return JobResult()

    sent = failed = 0

    for notification in claimed:
        channel = notification.channel

        if channel == "in_app":
            # Nothing to transmit — presence in the table is the delivery.
            notification.status = "sent"
            notification.sent_at = now
            sent += 1
            continue

        if channel in UNSUPPORTED_CHANNELS:
            notification.status = "failed"
            notification.error_message = f"No {channel} provider is configured."
            failed += 1
            continue

        if channel == "email":
            recipient = await session.scalar(
                select(User.email).where(User.id == notification.recipient_id)
            )
            if not recipient:
                notification.status = "failed"
                notification.error_message = "Recipient has no email address on file."
                failed += 1
                continue

            try:
                await email_service.send(
                    to=recipient,
                    subject=notification.subject or "Notification from Finovara",
                    body=notification.body,
                )
                notification.status = "sent"
                notification.sent_at = datetime.now(timezone.utc)
                notification.error_message = None
                sent += 1
            except email_service.EmailNotConfiguredError as exc:
                # Not a transient fault: retrying changes nothing until SMTP
                # is configured, so park it without burning attempts.
                notification.status = "failed"
                notification.error_message = str(exc)
                failed += 1
            except Exception as exc:  # noqa: BLE001 - transient SMTP faults
                notification.retry_count += 1
                notification.error_message = str(exc)[:500]
                if notification.retry_count >= MAX_ATTEMPTS:
                    notification.status = "failed"
                else:
                    notification.send_after = datetime.now(timezone.utc) + _backoff(
                        notification.retry_count
                    )
                failed += 1

    await session.flush()
    return JobResult(processed=sent, failed=failed, detail={"claimed": len(claimed)})


async def expire_abandoned(session: AsyncSession) -> JobResult:
    """Mark notifications that exhausted their retries but were never closed."""
    result = await session.execute(
        update(Notification)
        .where(Notification.status == "pending", Notification.retry_count >= MAX_ATTEMPTS)
        .values(status="failed", error_message="Maximum delivery attempts exceeded.")
    )
    return JobResult(processed=int(result.rowcount or 0))
