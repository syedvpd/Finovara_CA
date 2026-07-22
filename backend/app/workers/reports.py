"""Report generation worker.

Claims queued reports, builds the artefact, uploads it to the private
`generated-reports` bucket, and flips the row to 'ready'. The client is then
notified in-app and downloads via a short-lived signed URL.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from reportlab.lib.units import mm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import Bucket
from app.core.logging import get_logger
from app.models.accounting import JournalVoucher
from app.models.clients import Client, ClientEntity
from app.models.content import Notification
from app.models.finance import EmployeePayrollProfile, EmployeePayrollRecord, Invoice, InvoiceItem, PayrollRun
from app.models.operations import Audit, AuditObservation, ComplianceCalendarEntry, GstReturn
from app.models.system import AppSetting, Report
from app.repositories.accounting import JournalVoucherRepository
from app.services import pdf
from app.services.storage import get_storage
from app.workers.base import JobResult

logger = get_logger(__name__)

RETENTION_DAYS = 30
BATCH_SIZE = 5


async def _firm_details(session: AsyncSession) -> dict[str, Any]:
    """Letterhead values, read from settings rather than hardcoded."""
    rows = (
        await session.execute(
            select(AppSetting.key, AppSetting.value).where(AppSetting.category == "firm")
        )
    ).all()
    settings = {key.split(".", 1)[-1]: value for key, value in rows}
    return {
        "legal_name": settings.get("legal_name") or "Finovara Chartered Accountants LLP",
        "registered_address": settings.get("registered_address") or "",
        "gstin": settings.get("gstin") or "",
        "pan": settings.get("pan") or "",
    }


async def _client_details(session: AsyncSession, client_id: UUID | None) -> dict[str, Any]:
    if client_id is None:
        return {}
    client = await session.get(Client, client_id)
    if client is None:
        return {}
    entity = (
        await session.execute(
            select(ClientEntity)
            .where(ClientEntity.client_id == client_id, ClientEntity.deleted_at.is_(None))
            .limit(1)
        )
    ).scalars().first()
    return {
        "client_code": client.client_code,
        "legal_name": entity.legal_name if entity else client.client_code,
        "registered_address": entity.registered_address if entity else "",
        "gst_number": entity.gst_number if entity else None,
        "pan": entity.pan if entity else None,
    }


# --- Per-report builders -----------------------------------------------------


async def _build_invoice(session: AsyncSession, report: Report, firm: dict) -> tuple[bytes, str]:
    invoice_id = report.parameters.get("invoice_id")
    invoice = await session.get(Invoice, UUID(str(invoice_id)))
    if invoice is None:
        raise ValueError("Invoice not found.")
    items = (
        await session.execute(select(InvoiceItem).where(InvoiceItem.invoice_id == invoice.id))
    ).scalars().all()
    client = await _client_details(session, invoice.client_id)
    content = pdf.invoice_pdf(
        {c.name: getattr(invoice, c.name) for c in invoice.__table__.columns},
        [{c.name: getattr(i, c.name) for c in i.__table__.columns} for i in items],
        client, firm,
    )
    return content, "pdf"


async def _build_payslip(session: AsyncSession, report: Report, firm: dict) -> tuple[bytes, str]:
    record_id = report.parameters.get("payroll_record_id")
    record = await session.get(EmployeePayrollRecord, UUID(str(record_id)))
    if record is None:
        raise ValueError("Payroll record not found.")
    profile = await session.get(EmployeePayrollProfile, record.employee_profile_id)
    run = await session.get(PayrollRun, record.payroll_run_id)
    content = pdf.payslip_pdf(
        {c.name: getattr(record, c.name) for c in record.__table__.columns},
        {c.name: getattr(profile, c.name) for c in profile.__table__.columns},
        {"period_year": run.period_year, "period_month": run.period_month},
        firm,
    )
    return content, "pdf"


async def _build_payroll_register(session: AsyncSession, report: Report, firm: dict) -> tuple[bytes, str]:
    run_id = UUID(str(report.parameters.get("payroll_run_id")))
    run = await session.get(PayrollRun, run_id)
    if run is None:
        raise ValueError("Payroll run not found.")

    records = (
        await session.execute(
            select(EmployeePayrollRecord, EmployeePayrollProfile)
            .join(EmployeePayrollProfile, EmployeePayrollProfile.id == EmployeePayrollRecord.employee_profile_id)
            .where(EmployeePayrollRecord.payroll_run_id == run_id)
            .order_by(EmployeePayrollProfile.employee_name)
        )
    ).all()

    header = ["Code", "Employee", "Paid days", "Gross", "PF", "ESI", "PT", "TDS", "Other", "Net"]
    rows = [
        [
            profile.employee_code, profile.employee_name, str(record.attendance_days),
            pdf.rupees(record.gross_salary), pdf.rupees(record.pf_deduction),
            pdf.rupees(record.esi_deduction), pdf.rupees(record.pt_deduction),
            pdf.rupees(record.tds_deduction), pdf.rupees(record.other_deductions),
            pdf.rupees(record.net_salary),
        ]
        for record, profile in records
    ]
    period = f"{date(run.period_year, run.period_month, 1):%B %Y}"
    summary = [
        ("Gross", pdf.rupees(run.total_gross)),
        ("Deductions", pdf.rupees(run.total_deductions)),
        ("Net payable", pdf.rupees(run.total_net)),
    ]
    content = pdf.tabular_report_pdf(
        "Payroll Register", period, header, rows, firm,
        right_align={2, 3, 4, 5, 6, 7, 8, 9}, summary=summary,
    )
    return content, "pdf"


async def _build_trial_balance(session: AsyncSession, report: Report, firm: dict) -> tuple[bytes, str]:
    client_id = UUID(str(report.parameters.get("client_id") or report.client_id))
    as_of = report.period_end or date.today()
    rows_data = await JournalVoucherRepository(session).trial_balance(client_id, as_of)

    header = ["Code", "Account", "Type", "Debit", "Credit", "Closing"]
    rows = [
        [r["account_code"], r["account_name"], r["account_type"].title(),
         pdf.rupees(r["debit_total"]), pdf.rupees(r["credit_total"]), pdf.rupees(r["closing_balance"])]
        for r in rows_data
    ]
    total_debit = sum((Decimal(str(r["debit_total"])) for r in rows_data), Decimal("0"))
    total_credit = sum((Decimal(str(r["credit_total"])) for r in rows_data), Decimal("0"))
    client = await _client_details(session, client_id)

    content = pdf.tabular_report_pdf(
        "Trial Balance", f"{client.get('legal_name', '')} · as at {as_of:%d %b %Y}",
        header, rows, firm, right_align={3, 4, 5},
        summary=[("Total debit", pdf.rupees(total_debit)), ("Total credit", pdf.rupees(total_credit)),
                 ("Balanced", "Yes" if total_debit == total_credit else "NO")],
    )
    return content, "pdf"


async def _build_compliance(session: AsyncSession, report: Report, firm: dict) -> tuple[bytes, str]:
    client_id = report.client_id
    stmt = select(ComplianceCalendarEntry).order_by(ComplianceCalendarEntry.due_date)
    if client_id:
        stmt = stmt.where(ComplianceCalendarEntry.client_id == client_id)
    if report.period_start:
        stmt = stmt.where(ComplianceCalendarEntry.due_date >= report.period_start)
    if report.period_end:
        stmt = stmt.where(ComplianceCalendarEntry.due_date <= report.period_end)

    entries = (await session.execute(stmt)).scalars().all()
    header = ["Due date", "Obligation", "Tax year", "Period", "Status", "Filed on", "Acknowledgement"]
    rows = [
        [f"{e.due_date:%d %b %Y}",
         e.compliance_type.name if e.compliance_type else "-",
         e.tax_year, e.period or "-", e.status.title(),
         f"{e.filing_date:%d %b %Y}" if e.filing_date else "-",
         e.acknowledgement_number or "-"]
        for e in entries
    ]
    client = await _client_details(session, client_id)
    pending = sum(1 for e in entries if e.status == "pending")
    overdue = sum(1 for e in entries if e.status == "overdue")

    content = pdf.tabular_report_pdf(
        "Compliance Statement", client.get("legal_name", "All clients"), header, rows, firm,
        widths=[24 * mm, 46 * mm, 20 * mm, 20 * mm, 20 * mm, 22 * mm, 28 * mm],
        summary=[("Total", str(len(entries))), ("Pending", str(pending)), ("Overdue", str(overdue))],
    )
    return content, "pdf"


async def _build_receivables(session: AsyncSession, report: Report, firm: dict) -> tuple[bytes, str]:
    as_of = report.period_end or date.today()
    stmt = select(Invoice).where(
        Invoice.deleted_at.is_(None),
        Invoice.status.in_(("sent", "partially_paid", "overdue")),
    ).order_by(Invoice.due_date)
    if report.branch_id:
        stmt = stmt.where(Invoice.branch_id == report.branch_id)

    invoices = (await session.execute(stmt)).scalars().all()
    buckets = {"Current": Decimal("0"), "1-30": Decimal("0"), "31-60": Decimal("0"),
               "61-90": Decimal("0"), "90+": Decimal("0")}
    rows = []
    for invoice in invoices:
        age = (as_of - invoice.due_date).days
        bucket = ("Current" if age <= 0 else "1-30" if age <= 30 else
                  "31-60" if age <= 60 else "61-90" if age <= 90 else "90+")
        buckets[bucket] += Decimal(str(invoice.outstanding_amount))
        rows.append([invoice.invoice_number, f"{invoice.issue_date:%d %b %Y}",
                     f"{invoice.due_date:%d %b %Y}", str(max(age, 0)), bucket,
                     pdf.rupees(invoice.total_amount), pdf.rupees(invoice.outstanding_amount)])

    content = pdf.tabular_report_pdf(
        "Receivables Ageing", f"As at {as_of:%d %b %Y}",
        ["Invoice", "Issued", "Due", "Days", "Bucket", "Total", "Outstanding"],
        rows, firm, right_align={3, 5, 6},
        summary=[(k, pdf.rupees(v)) for k, v in buckets.items()],
    )
    return content, "pdf"


async def _build_gst_summary(session: AsyncSession, report: Report, firm: dict) -> tuple[bytes, str]:
    stmt = select(GstReturn).order_by(GstReturn.period_year, GstReturn.period_month)
    if report.client_id:
        stmt = stmt.where(GstReturn.client_id == report.client_id)
    if year := report.parameters.get("period_year"):
        stmt = stmt.where(GstReturn.period_year == int(year))

    returns = (await session.execute(stmt)).scalars().all()
    rows = [
        [str(r.period_year), str(r.period_month or "Annual"), r.return_type.upper().replace("_", "-"),
         r.status.replace("_", " ").title(), pdf.rupees(r.liability_amount),
         pdf.rupees(r.input_tax_credit), pdf.rupees(r.late_fee_calculated)]
        for r in returns
    ]
    output = sum((Decimal(str(r.liability_amount or 0)) for r in returns), Decimal("0"))
    itc = sum((Decimal(str(r.input_tax_credit or 0)) for r in returns), Decimal("0"))
    client = await _client_details(session, report.client_id)

    content = pdf.tabular_report_pdf(
        "GST Summary", client.get("legal_name", "All clients"),
        ["Year", "Month", "Return", "Status", "Output tax", "ITC", "Late fee"],
        rows, firm, right_align={4, 5, 6},
        summary=[("Output tax", pdf.rupees(output)), ("Input credit", pdf.rupees(itc)),
                 ("Net liability", pdf.rupees(max(output - itc, Decimal("0"))))],
    )
    return content, "pdf"


async def _build_audit_report(session: AsyncSession, report: Report, firm: dict) -> tuple[bytes, str]:
    audit_id = UUID(str(report.parameters.get("audit_id")))
    audit = await session.get(Audit, audit_id)
    if audit is None:
        raise ValueError("Audit not found.")
    observations = (
        await session.execute(
            select(AuditObservation).where(AuditObservation.audit_id == audit_id)
            .order_by(AuditObservation.created_at)
        )
    ).scalars().unique().all()

    client = await _client_details(session, audit.client_id)
    content = pdf.audit_report_pdf(
        {c.name: getattr(audit, c.name) for c in audit.__table__.columns},
        [{"title": o.title, "description": o.description, "risk_level": o.risk_level,
          "status": o.status, "responses": [{"response_text": r.response_text} for r in (o.responses or [])]}
         for o in observations],
        client, firm,
    )
    return content, "pdf"


BUILDERS = {
    "invoice_pdf": _build_invoice,
    "payslip_pdf": _build_payslip,
    "payroll_register": _build_payroll_register,
    "trial_balance": _build_trial_balance,
    "client_compliance": _build_compliance,
    "receivables_ageing": _build_receivables,
    "gst_summary": _build_gst_summary,
    "audit_report": _build_audit_report,
}


# --- Worker jobs -------------------------------------------------------------


async def generate_queued(session: AsyncSession) -> JobResult:
    claimed = (
        await session.execute(
            select(Report).where(Report.status == "queued")
            .order_by(Report.created_at).limit(BATCH_SIZE)
            .with_for_update(skip_locked=True)
        )
    ).scalars().all()

    if not claimed:
        return JobResult()

    for report in claimed:
        report.status = "generating"
    await session.flush()

    firm = await _firm_details(session)
    generated = failed = 0

    for report in claimed:
        builder = BUILDERS.get(report.report_type)
        if builder is None:
            report.status = "failed"
            report.error_message = f"No generator is registered for '{report.report_type}'."
            failed += 1
            continue

        try:
            content, extension = await builder(session, report, firm)
            scope = report.client_id or report.branch_id or "firm"
            path = f"{scope}/reports/{report.id}.{extension}"

            await get_storage().upload(
                Bucket.GENERATED_REPORTS.value, path, content,
                "application/pdf" if extension == "pdf" else "application/octet-stream",
                upsert=True,
            )

            report.file_path = f"{Bucket.GENERATED_REPORTS.value}/{path}"
            report.file_size = len(content)
            report.format = extension
            report.status = "ready"
            report.generated_at = datetime.now(timezone.utc)
            report.expires_at = datetime.now(timezone.utc) + timedelta(days=RETENTION_DAYS)
            report.error_message = None
            generated += 1

            if report.created_by:
                session.add(
                    Notification(
                        recipient_id=report.created_by,
                        channel="in_app",
                        subject="Report ready",
                        body=f'Your report "{report.title}" has been generated and is ready to download.',
                        status="pending",
                        retry_count=0,
                        created_at=datetime.now(timezone.utc),
                    )
                )
        except Exception as exc:  # noqa: BLE001 - one bad report must not stop the batch
            logger.exception("report_generation_failed", report_id=str(report.id))
            report.status = "failed"
            report.error_message = str(exc)[:500]
            failed += 1

    await session.flush()
    return JobResult(processed=generated, failed=failed)


async def expire_old_reports(session: AsyncSession) -> JobResult:
    now = datetime.now(timezone.utc)
    stale = (
        await session.execute(
            select(Report).where(
                Report.status == "ready",
                Report.expires_at.is_not(None),
                Report.expires_at < now,
            )
        )
    ).scalars().all()
    for report in stale:
        report.status = "expired"
    await session.flush()
    return JobResult(processed=len(stale))
