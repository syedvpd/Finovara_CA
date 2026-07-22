"""Scheduled sweeps: the reminder engine and due-date engine.

These implement the "Reminder Engine" and "Due Date Engine" from the
requirements. Each job is idempotent — running twice in a day must not queue a
notification twice — because a duplicate reminder to a client is worse than a
late one.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from string import Template

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.clients import Client, ClientEntity
from app.models.content import Notification, NotificationTemplate
from app.models.finance import Invoice
from app.models.identity import User
from app.models.operations import ComplianceCalendarEntry, DocumentRequest
from app.workers.base import JobResult

logger = get_logger(__name__)

#: Days before a due date on which a reminder is queued.
REMINDER_OFFSETS = (30, 15, 7, 3, 1)


async def _template(session: AsyncSession, code: str) -> NotificationTemplate | None:
    return (
        await session.execute(select(NotificationTemplate).where(NotificationTemplate.code == code))
    ).scalars().first()


async def _client_contact(session: AsyncSession, client_id) -> tuple[str | None, str]:
    """(user_id, display name) for a client."""
    row = (
        await session.execute(
            select(Client.user_id, ClientEntity.legal_name, Client.client_code)
            .outerjoin(ClientEntity, and_(
                ClientEntity.client_id == Client.id, ClientEntity.deleted_at.is_(None)
            ))
            .where(Client.id == client_id)
            .limit(1)
        )
    ).first()
    if row is None:
        return None, ""
    return row[0], (row[1] or row[2] or "Client")


async def _already_queued(session: AsyncSession, recipient_id, marker: str, since: datetime) -> bool:
    """Guard against duplicate reminders for the same subject in one window."""
    found = await session.scalar(
        select(func.count()).select_from(Notification).where(
            Notification.recipient_id == recipient_id,
            Notification.body.like(f"%{marker}%"),
            Notification.created_at >= since,
        )
    )
    return bool(found)


async def queue_compliance_reminders(session: AsyncSession) -> JobResult:
    """Queue reminders for obligations approaching their due date."""
    template = await _template(session, "compliance_reminder")
    if template is None:
        return JobResult(detail={"skipped": "compliance_reminder template missing"})

    today = date.today()
    targets = [today + timedelta(days=offset) for offset in REMINDER_OFFSETS]
    window_start = datetime.now(timezone.utc) - timedelta(hours=20)

    entries = (
        await session.execute(
            select(ComplianceCalendarEntry)
            .where(
                ComplianceCalendarEntry.status == "pending",
                ComplianceCalendarEntry.due_date.in_(targets),
            )
            .limit(500)
        )
    ).scalars().all()

    queued = 0
    for entry in entries:
        recipient_id, client_name = await _client_contact(session, entry.client_id)
        if recipient_id is None:
            continue

        marker = f"[ref:{entry.id}]"
        if await _already_queued(session, recipient_id, marker, window_start):
            continue

        obligation = entry.compliance_type.name if entry.compliance_type else "A statutory obligation"
        context = {
            "client_name": client_name,
            "compliance_name": obligation,
            "due_date": entry.due_date.strftime("%d %b %Y"),
        }
        session.add(
            Notification(
                recipient_id=recipient_id,
                template_id=template.id,
                channel=template.channel,
                subject=Template(template.subject_template or "").safe_substitute(context),
                body=Template(template.body_template).safe_substitute(context) + f"\n\n{marker}",
                status="pending",
                retry_count=0,
                created_at=datetime.now(timezone.utc),
            )
        )
        queued += 1

    await session.flush()
    return JobResult(processed=queued, detail={"candidates": len(entries)})


async def mark_overdue_compliance(session: AsyncSession) -> JobResult:
    """Due-date engine: flip pending obligations whose date has passed."""
    entries = (
        await session.execute(
            select(ComplianceCalendarEntry).where(
                ComplianceCalendarEntry.status == "pending",
                ComplianceCalendarEntry.due_date < date.today(),
            )
        )
    ).scalars().all()
    for entry in entries:
        entry.status = "overdue"
    await session.flush()
    return JobResult(processed=len(entries))


async def mark_overdue_invoices(session: AsyncSession) -> JobResult:
    """Flag issued invoices past their due date and notify the client once."""
    template = await _template(session, "invoice_overdue")
    window_start = datetime.now(timezone.utc) - timedelta(days=6)

    invoices = (
        await session.execute(
            select(Invoice).where(
                Invoice.deleted_at.is_(None),
                Invoice.status.in_(("sent", "partially_paid")),
                Invoice.due_date < date.today(),
            )
        )
    ).scalars().all()

    notified = 0
    for invoice in invoices:
        invoice.status = "overdue"

        if template is None:
            continue
        recipient_id, client_name = await _client_contact(session, invoice.client_id)
        if recipient_id is None:
            continue

        marker = f"[ref:{invoice.id}]"
        if await _already_queued(session, recipient_id, marker, window_start):
            continue

        context = {
            "client_name": client_name,
            "invoice_number": invoice.invoice_number,
            "amount": f"Rs. {Decimal(str(invoice.outstanding_amount)):,.2f}",
            "due_date": invoice.due_date.strftime("%d %b %Y"),
        }
        session.add(
            Notification(
                recipient_id=recipient_id,
                template_id=template.id,
                channel=template.channel,
                subject=Template(template.subject_template or "").safe_substitute(context),
                body=Template(template.body_template).safe_substitute(context) + f"\n\n{marker}",
                status="pending",
                retry_count=0,
                created_at=datetime.now(timezone.utc),
            )
        )
        notified += 1

    await session.flush()
    return JobResult(processed=len(invoices), detail={"notified": notified})


async def mark_overdue_document_requests(session: AsyncSession) -> JobResult:
    """Outstanding document requests past their due date."""
    requests = (
        await session.execute(
            select(DocumentRequest).where(
                DocumentRequest.status == "pending",
                DocumentRequest.due_date.is_not(None),
                DocumentRequest.due_date < date.today(),
            )
        )
    ).scalars().all()
    for request in requests:
        request.status = "overdue"
    await session.flush()
    return JobResult(processed=len(requests))


async def purge_expired_sessions(session: AsyncSession) -> JobResult:
    """Drop session rows whose tokens have expired."""
    from app.models.identity import UserSession

    expired = (
        await session.execute(
            select(UserSession).where(UserSession.expires_at < datetime.now(timezone.utc))
        )
    ).scalars().all()
    for row in expired:
        await session.delete(row)
    await session.flush()
    return JobResult(processed=len(expired))
