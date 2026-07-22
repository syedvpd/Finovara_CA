"""Report generation requests and dashboard analytics."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.core.logging import get_logger
from app.core.permissions import Action, Module
from app.core.security import AuthContext
from app.models.system import Report
from app.repositories.accounting import JournalVoucherRepository
from app.repositories.clients import ClientRepository, LeadRepository
from app.repositories.content import QueryRepository
from app.repositories.finance import InvoiceRepository
from app.repositories.operations import (
    AuditRepository,
    ComplianceCalendarRepository,
    DocumentRepository,
    GstReturnRepository,
    TaskRepository,
    TaxReturnRepository,
)
from app.repositories.system import ReportRepository
from app.services.base import BaseService
from app.services.storage import get_storage

logger = get_logger(__name__)

#: How long a generated report stays downloadable.
REPORT_RETENTION_DAYS = 30
REPORT_URL_TTL_SECONDS = 300


class ReportService(BaseService[Report, ReportRepository]):
    module = Module.REPORTS

    async def request(self, payload: dict[str, Any], auth: AuthContext) -> Report:
        """Queue a report. Generation happens out of band so a large export
        does not hold an HTTP connection open."""
        self._require(auth, Action.CREATE)

        client_id = payload.get("client_id")
        if auth.is_client:
            # A client may only ever request a report about themselves.
            client_id = auth.client_id
        elif client_id is not None:
            if await ClientRepository(self.repo.session).get(client_id) is None:
                raise NotFoundError("Client", client_id)

        report = await self.repo.create(
            {
                **payload,
                "client_id": client_id,
                "branch_id": payload.get("branch_id") or auth.branch_id,
                "status": "queued",
                "expires_at": datetime.now(timezone.utc) + timedelta(days=REPORT_RETENTION_DAYS),
                # A client-requested report is visible to them immediately;
                # a staff-generated one must be shared explicitly.
                "is_shared_with_client": auth.is_client,
            },
            actor_id=auth.user_id,
        )
        logger.info("report_queued", report_id=str(report.id), report_type=report.report_type)
        return report

    async def share(self, report_id: UUID, shared: bool, auth: AuthContext) -> Report:
        """Release a report to the client portal, or withdraw it."""
        self._require(auth, Action.UPDATE)
        if not auth.is_staff:
            raise ForbiddenError("Only firm personnel may share a report with a client.")

        report = await self.repo.get_scoped_or_404(report_id, auth)
        if shared and report.status != "ready":
            raise ConflictError("Only a generated report can be shared.")
        return await self.repo.update(report, {"is_shared_with_client": shared}, actor_id=auth.user_id)

    async def download_url(self, report_id: UUID, auth: AuthContext) -> tuple[str, str]:
        self._require(auth, Action.READ)
        report = await self.repo.get_scoped_or_404(report_id, auth)

        if report.status != "ready" or not report.file_path:
            raise ConflictError(f"This report is not available for download (status: {report.status}).")
        if auth.is_client and not report.is_shared_with_client:
            raise NotFoundError("Report", report_id)
        if report.expires_at and report.expires_at < datetime.now(timezone.utc):
            raise ConflictError("This report has expired. Please request it again.")

        bucket, _, path = report.file_path.partition("/")
        url = await get_storage().create_signed_url(bucket, path, REPORT_URL_TTL_SECONDS)
        return url, f"{report.title}.{report.format}"


class AnalyticsService:
    """Read-only aggregates backing the role dashboards.

    Every figure is scoped to what the caller may see: a client's dashboard is
    limited to their own records, non-admin staff to their branch.
    """

    module = Module.ANALYTICS

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _guard(self, auth: AuthContext) -> None:
        if not auth.can(f"{Module.ANALYTICS.value}:{Action.READ.value}"):
            raise ForbiddenError("You do not have permission to view analytics.")

    async def client_dashboard(self, auth: AuthContext) -> dict[str, Any]:
        """KPI tiles for the client portal."""
        self._guard(auth)
        if auth.client_id is None:
            raise ForbiddenError("No client profile is linked to this account.")

        client_id = auth.client_id
        today = date.today()

        receivables = await InvoiceRepository(self.session).receivables(client_id=client_id)
        documents = await DocumentRepository(self.session).category_counts(client_id)
        upcoming = await ComplianceCalendarRepository(self.session).due_between(
            today, today + timedelta(days=30), client_id=client_id
        )
        open_queries = await QueryRepository(self.session).open_count(client_id)

        task_repo = TaskRepository(self.session)
        open_tasks, _ = await task_repo.list(auth=auth)

        return {
            "open_tasks": len([t for t in open_tasks if t.status != "done"]),
            "open_queries": open_queries,
            "documents_by_category": documents,
            "upcoming_due_count": len(upcoming),
            "upcoming_due": [
                {"due_date": str(e.due_date), "tax_year": e.tax_year, "status": e.status}
                for e in upcoming[:10]
            ],
            "outstanding_amount": str(receivables["total_outstanding"]),
            "overdue_amount": str(receivables["overdue_amount"]),
            "invoice_count": receivables["invoice_count"],
        }

    async def firm_dashboard(self, auth: AuthContext) -> dict[str, Any]:
        """Firm-wide KPI tiles for the admin ERP."""
        self._guard(auth)
        if not auth.is_staff:
            raise ForbiddenError("This dashboard is restricted to firm personnel.")

        branch_id = None if auth.is_admin else auth.branch_id
        today = date.today()

        client_counts = await ClientRepository(self.session).status_counts(branch_id)
        task_counts = await TaskRepository(self.session).status_counts(branch_id)
        receivables = await InvoiceRepository(self.session).receivables(branch_id=branch_id)
        pipeline = await LeadRepository(self.session).pipeline_counts()

        due_this_week = await ComplianceCalendarRepository(self.session).due_between(
            today, today + timedelta(days=7)
        )

        audits, audit_total = await AuditRepository(self.session).list(auth=auth)
        tax_returns, tax_total = await TaxReturnRepository(self.session).list(auth=auth)
        gst_returns, gst_total = await GstReturnRepository(self.session).list(auth=auth)

        return {
            "clients": {
                "total": sum(client_counts.values()),
                "by_status": client_counts,
            },
            "tasks": {
                "by_status": task_counts,
                "open": sum(v for k, v in task_counts.items() if k != "done"),
            },
            "leads": {"by_stage": pipeline, "total": sum(pipeline.values())},
            "revenue": {
                "invoiced": str(receivables["total_invoiced"]),
                "collected": str(receivables["total_collected"]),
                "outstanding": str(receivables["total_outstanding"]),
                "overdue": str(receivables["overdue_amount"]),
                "overdue_count": receivables["overdue_count"],
            },
            "compliance": {"due_this_week": len(due_this_week)},
            "workload": {
                "active_audits": len([a for a in audits if a.status != "completed"]),
                "audits_total": audit_total,
                "tax_returns_pending": len(
                    [t for t in tax_returns if t.status != "acknowledgement_received"]
                ),
                "tax_returns_total": tax_total,
                "gst_returns_pending": len(
                    [g for g in gst_returns if g.status != "acknowledgement_received"]
                ),
                "gst_returns_total": gst_total,
            },
        }

    async def trial_balance_health(self, client_id: UUID, auth: AuthContext) -> dict[str, Any]:
        """Whether a client's books currently balance."""
        self._guard(auth)
        if auth.is_client and client_id != auth.client_id:
            raise ForbiddenError("You may only access your own records.")

        rows = await JournalVoucherRepository(self.session).trial_balance(client_id, date.today())
        total_debit = sum((row["debit_total"] for row in rows), start=0)
        total_credit = sum((row["credit_total"] for row in rows), start=0)
        return {
            "account_count": len(rows),
            "total_debit": str(total_debit),
            "total_credit": str(total_credit),
            "is_balanced": total_debit == total_credit,
        }


def report_service(s: AsyncSession) -> ReportService:
    return ReportService(ReportRepository(s))


def analytics_service(s: AsyncSession) -> AnalyticsService:
    return AnalyticsService(s)
