"""Repositories for documents, tasks, compliance, audit, and filings."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import func, select

from app.models.operations import (
    Audit,
    AuditChecklistItem,
    AuditObservation,
    AuditResponse,
    ComplianceCalendarEntry,
    ComplianceType,
    Document,
    DocumentActionLog,
    DocumentFolder,
    DocumentRequest,
    DocumentVersion,
    GstReturn,
    Task,
    TaskAssignment,
    TaxReturn,
)
from app.repositories.base import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    model = Document
    searchable_fields = ("name", "description")
    sortable_fields = ("name", "file_category", "status", "file_size", "created_at", "updated_at")
    client_column = "client_id"

    async def versions(self, document_id: UUID) -> list[DocumentVersion]:
        stmt = (
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document_id)
            .order_by(DocumentVersion.version_number.desc())
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def record_action(
        self,
        document_id: UUID,
        user_id: UUID | None,
        action: str,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        """Append to the access trail. Every view and download is recorded."""
        self.session.add(
            DocumentActionLog(
                document_id=document_id,
                user_id=user_id,
                action_type=action,
                ip_address=ip_address,
                user_agent=user_agent,
                created_at=func.now(),
            )
        )
        await self.session.flush()

    async def category_counts(self, client_id: UUID) -> dict[str, int]:
        stmt = (
            select(Document.file_category, func.count())
            .where(Document.client_id == client_id, Document.deleted_at.is_(None))
            .group_by(Document.file_category)
        )
        return {category: count for category, count in (await self.session.execute(stmt)).all()}


class DocumentFolderRepository(BaseRepository[DocumentFolder]):
    model = DocumentFolder
    searchable_fields = ("name",)
    sortable_fields = ("name", "created_at")
    default_sort = "name"
    client_column = "client_id"


class DocumentRequestRepository(BaseRepository[DocumentRequest]):
    model = DocumentRequest
    searchable_fields = ("title", "description")
    sortable_fields = ("title", "status", "due_date", "created_at")
    client_column = "client_id"

    async def overdue(self, as_of: date) -> list[DocumentRequest]:
        stmt = self.base_query().where(
            DocumentRequest.status == "pending",
            DocumentRequest.due_date.is_not(None),
            DocumentRequest.due_date < as_of,
        )
        return list((await self.session.execute(stmt)).scalars().all())


class TaskRepository(BaseRepository[Task]):
    model = Task
    searchable_fields = ("title", "description")
    sortable_fields = ("title", "status", "priority", "due_date", "task_type", "created_at")
    client_column = "client_id"
    branch_column = "branch_id"

    async def assignments_for(self, task_id: UUID) -> list[TaskAssignment]:
        stmt = select(TaskAssignment).where(TaskAssignment.task_id == task_id)
        return list((await self.session.execute(stmt)).scalars().all())

    async def assigned_to_employee(
        self, employee_id: UUID, *, open_only: bool = True
    ) -> list[Task]:
        stmt = (
            self.base_query()
            .join(TaskAssignment, TaskAssignment.task_id == Task.id)
            .where(TaskAssignment.employee_id == employee_id)
        )
        if open_only:
            stmt = stmt.where(Task.status != "done")
        return list((await self.session.execute(stmt)).scalars().unique().all())

    async def workload_by_employee(self, branch_id: UUID | None = None) -> dict[str, int]:
        stmt = (
            select(TaskAssignment.employee_id, func.count())
            .join(Task, Task.id == TaskAssignment.task_id)
            .where(Task.deleted_at.is_(None), Task.status != "done")
        )
        if branch_id:
            stmt = stmt.where(Task.branch_id == branch_id)
        rows = await self.session.execute(stmt.group_by(TaskAssignment.employee_id))
        return {str(employee_id): count for employee_id, count in rows.all()}

    async def status_counts(self, branch_id: UUID | None = None) -> dict[str, int]:
        stmt = select(Task.status, func.count()).where(Task.deleted_at.is_(None))
        if branch_id:
            stmt = stmt.where(Task.branch_id == branch_id)
        rows = await self.session.execute(stmt.group_by(Task.status))
        return {status: count for status, count in rows.all()}


class ComplianceTypeRepository(BaseRepository[ComplianceType]):
    model = ComplianceType
    searchable_fields = ("name", "description")
    sortable_fields = ("name", "authority", "frequency", "created_at")
    default_sort = "name"


class ComplianceCalendarRepository(BaseRepository[ComplianceCalendarEntry]):
    model = ComplianceCalendarEntry
    sortable_fields = ("due_date", "status", "tax_year", "created_at")
    default_sort = "due_date"
    client_column = "client_id"

    async def due_between(
        self, start: date, end: date, *, client_id: UUID | None = None
    ) -> list[ComplianceCalendarEntry]:
        stmt = self.base_query().where(
            ComplianceCalendarEntry.due_date >= start,
            ComplianceCalendarEntry.due_date <= end,
            ComplianceCalendarEntry.status == "pending",
        )
        if client_id:
            stmt = stmt.where(ComplianceCalendarEntry.client_id == client_id)
        return list((await self.session.execute(stmt.order_by(ComplianceCalendarEntry.due_date))).scalars().all())

    async def mark_overdue(self, as_of: date) -> int:
        """Flip pending items whose due date has passed. Returns the count."""
        stmt = self.base_query().where(
            ComplianceCalendarEntry.status == "pending", ComplianceCalendarEntry.due_date < as_of
        )
        rows = list((await self.session.execute(stmt)).scalars().all())
        for row in rows:
            row.status = "overdue"
        await self.session.flush()
        return len(rows)

    async def duplicate_exists(
        self, client_id: UUID, compliance_type_id: UUID, tax_year: str, period: str | None
    ) -> bool:
        stmt = self.base_query().where(
            ComplianceCalendarEntry.client_id == client_id,
            ComplianceCalendarEntry.compliance_type_id == compliance_type_id,
            ComplianceCalendarEntry.tax_year == tax_year,
            ComplianceCalendarEntry.period.is_not_distinct_from(period),
        )
        return (await self.session.execute(stmt)).scalars().first() is not None


class AuditRepository(BaseRepository[Audit]):
    model = Audit
    sortable_fields = ("start_date", "status", "audit_type", "risk_rating", "created_at")
    default_sort = "start_date"
    client_column = "client_id"


class AuditChecklistRepository(BaseRepository[AuditChecklistItem]):
    model = AuditChecklistItem
    searchable_fields = ("item_name", "description")
    sortable_fields = ("item_name", "status", "created_at")
    default_sort = "created_at"

    async def completion(self, audit_id: UUID) -> tuple[int, int]:
        """(completed_or_na, total) for an audit's checklist."""
        rows = await self.session.execute(
            select(AuditChecklistItem.status, func.count())
            .where(AuditChecklistItem.audit_id == audit_id)
            .group_by(AuditChecklistItem.status)
        )
        counts = {status: count for status, count in rows.all()}
        total = sum(counts.values())
        return counts.get("completed", 0) + counts.get("not_applicable", 0), total


class AuditObservationRepository(BaseRepository[AuditObservation]):
    model = AuditObservation
    searchable_fields = ("title", "description")
    sortable_fields = ("title", "risk_level", "status", "created_at")

    async def open_count(self, audit_id: UUID) -> int:
        total = await self.session.scalar(
            select(func.count())
            .select_from(AuditObservation)
            .where(AuditObservation.audit_id == audit_id, AuditObservation.status.in_(("open", "management_responded")))
        )
        return int(total or 0)


class AuditResponseRepository(BaseRepository[AuditResponse]):
    model = AuditResponse
    sortable_fields = ("responded_at", "created_at")
    default_sort = "responded_at"


class TaxReturnRepository(BaseRepository[TaxReturn]):
    model = TaxReturn
    sortable_fields = ("financial_year", "status", "return_type", "created_at")
    default_sort = "created_at"
    client_column = "client_id"

    async def duplicate_exists(self, entity_id: UUID, financial_year: str, return_type: str) -> bool:
        stmt = self.base_query().where(
            TaxReturn.entity_id == entity_id,
            TaxReturn.financial_year == financial_year,
            TaxReturn.return_type == return_type,
        )
        return (await self.session.execute(stmt)).scalars().first() is not None


class GstReturnRepository(BaseRepository[GstReturn]):
    model = GstReturn
    sortable_fields = ("period_year", "period_month", "status", "return_type", "created_at")
    default_sort = "period_year"
    client_column = "client_id"

    async def duplicate_exists(
        self, entity_id: UUID, year: int, month: int | None, return_type: str
    ) -> bool:
        stmt = self.base_query().where(
            GstReturn.entity_id == entity_id,
            GstReturn.period_year == year,
            GstReturn.period_month.is_not_distinct_from(month),
            GstReturn.return_type == return_type,
        )
        return (await self.session.execute(stmt)).scalars().first() is not None
