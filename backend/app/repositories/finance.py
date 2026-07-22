"""Repositories for payroll, invoicing, and payments."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, or_, select

from app.models.finance import (
    CreditNote,
    EmployeePayrollProfile,
    EmployeePayrollRecord,
    Invoice,
    InvoiceItem,
    Payment,
    PayrollRun,
    Refund,
)
from app.models.system import PayrollAttendance, PayrollStatutoryConfig
from app.repositories.base import BaseRepository


class PayrollProfileRepository(BaseRepository[EmployeePayrollProfile]):
    model = EmployeePayrollProfile
    searchable_fields = ("employee_name", "employee_code", "pan")
    sortable_fields = ("employee_name", "employee_code", "base_salary", "created_at")
    default_sort = "employee_name"
    client_column = "client_id"

    async def code_taken(self, client_id: UUID, code: str, *, exclude_id: UUID | None = None) -> bool:
        stmt = self.base_query().where(
            EmployeePayrollProfile.client_id == client_id,
            EmployeePayrollProfile.employee_code == code,
        )
        if exclude_id:
            stmt = stmt.where(EmployeePayrollProfile.id != exclude_id)
        return (await self.session.execute(stmt)).scalars().first() is not None

    async def for_client(self, client_id: UUID) -> list[EmployeePayrollProfile]:
        stmt = self.base_query().where(EmployeePayrollProfile.client_id == client_id)
        return list((await self.session.execute(stmt)).scalars().all())


class AttendanceRepository(BaseRepository[PayrollAttendance]):
    model = PayrollAttendance
    sortable_fields = ("period_year", "period_month", "created_at")
    default_sort = "period_year"

    async def get_for_period(
        self, profile_id: UUID, year: int, month: int
    ) -> PayrollAttendance | None:
        return await self.get_by(
            employee_profile_id=profile_id, period_year=year, period_month=month
        )

    async def upsert(self, data: dict, actor_id: UUID | None) -> PayrollAttendance:
        existing = await self.get_for_period(
            data["employee_profile_id"], data["period_year"], data["period_month"]
        )
        if existing is not None:
            return await self.update(existing, data, actor_id=actor_id)
        return await self.create(data, actor_id=actor_id)


class StatutoryConfigRepository(BaseRepository[PayrollStatutoryConfig]):
    model = PayrollStatutoryConfig
    sortable_fields = ("financial_year", "component", "effective_from")
    default_sort = "effective_from"

    async def resolve(
        self, component: str, on: date, *, state_code: str | None = None
    ) -> PayrollStatutoryConfig | None:
        """Rate in force for a component on a date.

        A state-specific row wins over the national default, and the most
        recently effective row wins within each of those.
        """
        stmt = (
            select(PayrollStatutoryConfig)
            .where(
                PayrollStatutoryConfig.component == component,
                PayrollStatutoryConfig.is_active.is_(True),
                PayrollStatutoryConfig.effective_from <= on,
                or_(
                    PayrollStatutoryConfig.effective_to.is_(None),
                    PayrollStatutoryConfig.effective_to >= on,
                ),
                or_(
                    PayrollStatutoryConfig.state_code == state_code,
                    PayrollStatutoryConfig.state_code.is_(None),
                ),
            )
            # NULLS LAST puts the state-specific row ahead of the national one.
            .order_by(
                PayrollStatutoryConfig.state_code.desc().nullslast(),
                PayrollStatutoryConfig.effective_from.desc(),
            )
            .limit(1)
        )
        return (await self.session.execute(stmt)).scalars().first()


class PayrollRunRepository(BaseRepository[PayrollRun]):
    model = PayrollRun
    sortable_fields = ("period_year", "period_month", "status", "created_at")
    default_sort = "period_year"
    branch_column = "branch_id"

    async def period_exists(self, branch_id: UUID, year: int, month: int) -> bool:
        stmt = self.base_query().where(
            PayrollRun.branch_id == branch_id,
            PayrollRun.period_year == year,
            PayrollRun.period_month == month,
        )
        return (await self.session.execute(stmt)).scalars().first() is not None

    async def records_for(self, run_id: UUID) -> list[EmployeePayrollRecord]:
        stmt = select(EmployeePayrollRecord).where(EmployeePayrollRecord.payroll_run_id == run_id)
        return list((await self.session.execute(stmt)).scalars().all())

    async def clear_records(self, run_id: UUID) -> None:
        """Recalculation replaces prior figures rather than accumulating them."""
        for record in await self.records_for(run_id):
            await self.session.delete(record)
        await self.session.flush()


class InvoiceRepository(BaseRepository[Invoice]):
    model = Invoice
    searchable_fields = ("invoice_number", "notes")
    sortable_fields = (
        "invoice_number", "issue_date", "due_date", "status", "total_amount",
        "outstanding_amount", "created_at",
    )
    default_sort = "issue_date"
    client_column = "client_id"
    branch_column = "branch_id"

    async def items_for(self, invoice_id: UUID) -> list[InvoiceItem]:
        stmt = select(InvoiceItem).where(InvoiceItem.invoice_id == invoice_id)
        return list((await self.session.execute(stmt)).scalars().all())

    async def mark_overdue(self, as_of: date) -> int:
        stmt = self.base_query().where(
            Invoice.status.in_(("sent", "partially_paid")), Invoice.due_date < as_of
        )
        rows = list((await self.session.execute(stmt)).scalars().all())
        for row in rows:
            row.status = "overdue"
        await self.session.flush()
        return len(rows)

    async def receivables(self, *, client_id: UUID | None = None, branch_id: UUID | None = None) -> dict:
        stmt = select(
            func.coalesce(func.sum(Invoice.total_amount), 0),
            func.coalesce(func.sum(Invoice.paid_amount), 0),
            func.coalesce(func.sum(Invoice.outstanding_amount), 0),
            func.count(),
        ).where(Invoice.deleted_at.is_(None), Invoice.status != "void")

        if client_id:
            stmt = stmt.where(Invoice.client_id == client_id)
        if branch_id:
            stmt = stmt.where(Invoice.branch_id == branch_id)

        invoiced, collected, outstanding, count = (await self.session.execute(stmt)).one()

        overdue_stmt = select(
            func.coalesce(func.sum(Invoice.outstanding_amount), 0), func.count()
        ).where(
            Invoice.deleted_at.is_(None),
            Invoice.status == "overdue",
        )
        if client_id:
            overdue_stmt = overdue_stmt.where(Invoice.client_id == client_id)
        if branch_id:
            overdue_stmt = overdue_stmt.where(Invoice.branch_id == branch_id)

        overdue_amount, overdue_count = (await self.session.execute(overdue_stmt)).one()

        return {
            "total_invoiced": Decimal(invoiced),
            "total_collected": Decimal(collected),
            "total_outstanding": Decimal(outstanding),
            "overdue_amount": Decimal(overdue_amount),
            "overdue_count": int(overdue_count),
            "invoice_count": int(count),
        }


class PaymentRepository(BaseRepository[Payment]):
    model = Payment
    searchable_fields = ("payment_number", "transaction_id")
    sortable_fields = ("payment_date", "amount", "status", "created_at")
    default_sort = "payment_date"
    client_column = "client_id"

    async def cleared_total(self, invoice_id: UUID) -> Decimal:
        total = await self.session.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.invoice_id == invoice_id, Payment.status == "cleared"
            )
        )
        return Decimal(total or 0)

    async def transaction_id_taken(self, transaction_id: str) -> bool:
        """Guards against the same bank reference being banked twice."""
        stmt = select(Payment.id).where(Payment.transaction_id == transaction_id).limit(1)
        return (await self.session.execute(stmt)).first() is not None


class CreditNoteRepository(BaseRepository[CreditNote]):
    model = CreditNote
    sortable_fields = ("created_at", "amount")

    async def active_total(self, invoice_id: UUID) -> Decimal:
        total = await self.session.scalar(
            select(func.coalesce(func.sum(CreditNote.amount), 0)).where(
                CreditNote.invoice_id == invoice_id, CreditNote.status == "active"
            )
        )
        return Decimal(total or 0)


class RefundRepository(BaseRepository[Refund]):
    model = Refund
    sortable_fields = ("refund_date", "amount", "status", "created_at")
    default_sort = "refund_date"

    async def refunded_total(self, payment_id: UUID) -> Decimal:
        total = await self.session.scalar(
            select(func.coalesce(func.sum(Refund.amount), 0)).where(
                Refund.payment_id == payment_id, Refund.status != "failed"
            )
        )
        return Decimal(total or 0)
