"""Payroll, billing, payments, and the general ledger."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import (
    created_ts,
    AuditMixin,
    Base,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    bigint_col,
    date_col,
    fk,
    int_col,
    json_col,
    money_col,
    str_col,
    text_col,
    ts_col,
)

# --- Payroll -----------------------------------------------------------------


class PayrollRun(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "payroll_runs"

    branch_id: Mapped[uuid.UUID] = fk("branches.id", ondelete="RESTRICT")
    period_month: Mapped[int] = int_col()
    period_year: Mapped[int] = int_col()
    status: Mapped[str] = str_col(30, default="draft")
    total_gross: Mapped[Decimal] = money_col()
    total_deductions: Mapped[Decimal] = money_col()
    total_net: Mapped[Decimal] = money_col()
    processed_by: Mapped[uuid.UUID | None] = fk("employees.id", ondelete="SET NULL", nullable=True)
    processed_at: Mapped[datetime | None] = ts_col()

    records: Mapped[list[EmployeePayrollRecord]] = relationship(
        back_populates="run", lazy="selectin",
        primaryjoin="PayrollRun.id == EmployeePayrollRecord.payroll_run_id",
    )


class EmployeePayrollProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """A client's employee, whose payroll the firm processes."""

    __tablename__ = "employee_payroll_profiles"

    client_id: Mapped[uuid.UUID] = fk("clients.id")
    employee_name: Mapped[str] = str_col(150)
    employee_code: Mapped[str] = str_col(30)
    pan: Mapped[str | None] = str_col(10, nullable=True)
    pf_number: Mapped[str | None] = str_col(30, nullable=True)
    uan: Mapped[str | None] = str_col(12, nullable=True)
    esi_number: Mapped[str | None] = str_col(17, nullable=True)
    bank_account_no: Mapped[str] = str_col(30)
    bank_ifsc: Mapped[str] = str_col(11)
    base_salary: Mapped[Decimal] = money_col()
    monthly_allowances: Mapped[dict] = json_col(default=dict)
    monthly_deductions: Mapped[dict] = json_col(default=dict)


class EmployeePayrollRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """One employee's payslip within one payroll run."""

    __tablename__ = "employee_payroll_records"

    payroll_run_id: Mapped[uuid.UUID] = fk("payroll_runs.id")
    employee_profile_id: Mapped[uuid.UUID] = fk("employee_payroll_profiles.id")
    attendance_days: Mapped[Decimal] = mapped_column(Numeric(4, 1), nullable=False)
    lwp_days: Mapped[Decimal] = mapped_column(Numeric(4, 1), nullable=False, default=Decimal("0.0"))
    basic_salary_earned: Mapped[Decimal] = money_col()
    gross_salary: Mapped[Decimal] = money_col()
    pf_deduction: Mapped[Decimal] = money_col()
    esi_deduction: Mapped[Decimal] = money_col()
    pt_deduction: Mapped[Decimal] = money_col()
    tds_deduction: Mapped[Decimal] = money_col()
    other_deductions: Mapped[Decimal] = money_col()
    net_salary: Mapped[Decimal] = money_col()
    payslip_url: Mapped[str | None] = text_col()
    paid_at: Mapped[datetime | None] = ts_col()

    run: Mapped[PayrollRun] = relationship(back_populates="records", foreign_keys=[payroll_run_id])
    profile: Mapped[EmployeePayrollProfile] = relationship(lazy="joined", foreign_keys=[employee_profile_id])


# --- Billing -----------------------------------------------------------------


class Invoice(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, AuditMixin):
    __tablename__ = "invoices"

    invoice_number: Mapped[str] = str_col(50, unique=True)
    client_id: Mapped[uuid.UUID] = fk("clients.id")
    client_service_id: Mapped[uuid.UUID | None] = fk("client_services.id", ondelete="SET NULL", nullable=True)
    branch_id: Mapped[uuid.UUID] = fk("branches.id", ondelete="RESTRICT")
    issue_date: Mapped[date] = date_col(nullable=False)
    due_date: Mapped[date] = date_col(nullable=False)
    status: Mapped[str] = str_col(30, default="draft")
    subtotal: Mapped[Decimal] = money_col()
    discount_amount: Mapped[Decimal] = money_col()
    discount_approved_by: Mapped[uuid.UUID | None] = fk("employees.id", ondelete="SET NULL", nullable=True)
    tax_amount: Mapped[Decimal] = money_col()
    total_amount: Mapped[Decimal] = money_col()
    paid_amount: Mapped[Decimal] = money_col()
    outstanding_amount: Mapped[Decimal] = money_col()
    notes: Mapped[str | None] = text_col()

    items: Mapped[list[InvoiceItem]] = relationship(
        back_populates="invoice", lazy="selectin", primaryjoin="Invoice.id == InvoiceItem.invoice_id"
    )


class InvoiceItem(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "invoice_items"

    invoice_id: Mapped[uuid.UUID] = fk("invoices.id")
    service_id: Mapped[uuid.UUID | None] = fk("services.id", ondelete="SET NULL", nullable=True)
    description: Mapped[str] = text_col(nullable=False)
    quantity: Mapped[int] = int_col(default=1)
    unit_price: Mapped[Decimal] = money_col()
    tax_rate_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("18.00"))
    tax_amount: Mapped[Decimal] = money_col()
    total_amount: Mapped[Decimal] = money_col()
    created_at: Mapped[datetime] = created_ts()

    invoice: Mapped[Invoice] = relationship(back_populates="items", foreign_keys=[invoice_id])


class Payment(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "payments"

    invoice_id: Mapped[uuid.UUID] = fk("invoices.id", ondelete="RESTRICT")
    payment_number: Mapped[str] = str_col(50, unique=True)
    client_id: Mapped[uuid.UUID] = fk("clients.id", ondelete="RESTRICT")
    amount: Mapped[Decimal] = money_col()
    payment_date: Mapped[date] = date_col(nullable=False)
    payment_method: Mapped[str] = str_col(30)
    transaction_id: Mapped[str | None] = str_col(100, nullable=True)
    status: Mapped[str] = str_col(30, default="pending")
    reconciliation_status: Mapped[str] = str_col(30, default="pending")
    reconciled_by: Mapped[uuid.UUID | None] = fk("employees.id", ondelete="SET NULL", nullable=True)
    reconciled_at: Mapped[datetime | None] = ts_col()
    created_at: Mapped[datetime] = created_ts()


class CreditNote(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "credit_notes"

    invoice_id: Mapped[uuid.UUID] = fk("invoices.id")
    credit_note_number: Mapped[str] = str_col(50, unique=True)
    amount: Mapped[Decimal] = money_col()
    reason: Mapped[str] = text_col(nullable=False)
    status: Mapped[str] = str_col(30, default="active")
    created_at: Mapped[datetime] = created_ts()
    created_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)


class DebitNote(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "debit_notes"

    invoice_id: Mapped[uuid.UUID] = fk("invoices.id")
    debit_note_number: Mapped[str] = str_col(50, unique=True)
    amount: Mapped[Decimal] = money_col()
    reason: Mapped[str] = text_col(nullable=False)
    status: Mapped[str] = str_col(30, default="active")
    created_at: Mapped[datetime] = created_ts()
    created_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)


class Refund(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "refunds"

    payment_id: Mapped[uuid.UUID] = fk("payments.id", ondelete="RESTRICT")
    refund_number: Mapped[str] = str_col(50, unique=True)
    amount: Mapped[Decimal] = money_col()
    reason: Mapped[str] = text_col(nullable=False)
    refund_date: Mapped[date] = date_col(nullable=False)
    status: Mapped[str] = str_col(30, default="pending")
    approved_by: Mapped[uuid.UUID | None] = fk("employees.id", ondelete="SET NULL", nullable=True)
    created_at: Mapped[datetime] = created_ts()


class GeneralLedgerEntry(Base, UUIDPrimaryKeyMixin):
    """Double-entry line. Debits and credits are posted in balanced pairs."""

    __tablename__ = "general_ledger"

    branch_id: Mapped[uuid.UUID] = fk("branches.id", ondelete="RESTRICT")
    account_code: Mapped[str] = str_col(30)
    account_name: Mapped[str] = str_col(100)
    transaction_type: Mapped[str] = str_col(10)
    amount: Mapped[Decimal] = money_col()
    reference_type: Mapped[str] = str_col(30)
    reference_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    entry_date: Mapped[date] = date_col(nullable=False)
    description: Mapped[str | None] = text_col()
    created_at: Mapped[datetime] = created_ts()


class DocumentNumberCounter(Base):
    """Atomic counters backing race-free invoice/payment/note numbering."""

    __tablename__ = "document_number_counters"

    scope: Mapped[str] = str_col(100, primary_key=True)
    current_value: Mapped[int] = bigint_col(default=0)
    updated_at: Mapped[datetime] = created_ts()
