"""Schemas for payroll, invoicing, and payments."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import Field, model_validator

from app.schemas.common import APIModel

Money = Annotated[Decimal, Field(ge=0, max_digits=15, decimal_places=2)]
Days = Annotated[Decimal, Field(ge=0, le=31, max_digits=4, decimal_places=1)]
IFSC_PATTERN = r"^[A-Z]{4}0[A-Z0-9]{6}$"
PAN_PATTERN = r"^[A-Z]{5}[0-9]{4}[A-Z]$"

BILLING_STATUSES = ("draft", "sent", "partially_paid", "paid", "void", "overdue")
PAYMENT_METHODS = ("upi", "net_banking", "card", "cash", "bank_transfer")


# --- Payroll profiles --------------------------------------------------------


class PayrollProfileRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID
    employee_name: str
    employee_code: str
    pan: str | None = None
    pf_number: str | None = None
    uan: str | None = None
    esi_number: str | None = None
    bank_ifsc: str
    base_salary: Decimal
    monthly_allowances: dict = Field(default_factory=dict)
    monthly_deductions: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    # bank_account_no is withheld from list/read responses by design.


class PayrollProfileCreate(APIModel):
    client_id: uuid.UUID
    employee_name: Annotated[str, Field(min_length=2, max_length=150)]
    employee_code: Annotated[str, Field(min_length=1, max_length=30)]
    bank_account_no: Annotated[str, Field(min_length=6, max_length=30)]
    bank_ifsc: Annotated[str, Field(pattern=IFSC_PATTERN)]
    base_salary: Money
    pan: Annotated[str, Field(pattern=PAN_PATTERN)] | None = None
    pf_number: Annotated[str, Field(max_length=30)] | None = None
    uan: Annotated[str, Field(pattern=r"^[0-9]{12}$")] | None = None
    esi_number: Annotated[str, Field(max_length=17)] | None = None
    monthly_allowances: dict[str, Decimal] = Field(default_factory=dict)
    monthly_deductions: dict[str, Decimal] = Field(default_factory=dict)


class PayrollProfileUpdate(APIModel):
    employee_name: Annotated[str, Field(min_length=2, max_length=150)] | None = None
    bank_account_no: Annotated[str, Field(min_length=6, max_length=30)] | None = None
    bank_ifsc: Annotated[str, Field(pattern=IFSC_PATTERN)] | None = None
    base_salary: Money | None = None
    pan: Annotated[str, Field(pattern=PAN_PATTERN)] | None = None
    uan: Annotated[str, Field(pattern=r"^[0-9]{12}$")] | None = None
    esi_number: Annotated[str, Field(max_length=17)] | None = None
    monthly_allowances: dict[str, Decimal] | None = None
    monthly_deductions: dict[str, Decimal] | None = None


# --- Attendance --------------------------------------------------------------


class AttendanceRead(APIModel):
    id: uuid.UUID
    employee_profile_id: uuid.UUID
    period_month: int
    period_year: int
    working_days: Decimal
    present_days: Decimal
    paid_leave_days: Decimal
    lwp_days: Decimal
    overtime_hours: Decimal
    source: str
    created_at: datetime


class AttendanceUpsert(APIModel):
    employee_profile_id: uuid.UUID
    period_month: Annotated[int, Field(ge=1, le=12)]
    period_year: Annotated[int, Field(ge=2000, le=2100)]
    working_days: Days
    present_days: Days
    paid_leave_days: Days = Decimal("0.0")
    lwp_days: Days = Decimal("0.0")
    overtime_hours: Annotated[Decimal, Field(ge=0, le=400, max_digits=6, decimal_places=2)] = Decimal("0.00")

    @model_validator(mode="after")
    def _days_reconcile(self) -> AttendanceUpsert:
        accounted = self.present_days + self.paid_leave_days + self.lwp_days
        if accounted > self.working_days:
            raise ValueError(
                f"Days accounted for ({accounted}) exceed the working days ({self.working_days})."
            )
        return self


class AttendanceBulkUpsert(APIModel):
    records: Annotated[list[AttendanceUpsert], Field(min_length=1, max_length=500)]


# --- Payroll runs ------------------------------------------------------------


class PayrollRunRead(APIModel):
    id: uuid.UUID
    branch_id: uuid.UUID
    period_month: int
    period_year: int
    status: str
    total_gross: Decimal
    total_deductions: Decimal
    total_net: Decimal
    processed_by: uuid.UUID | None = None
    processed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class PayrollRunCreate(APIModel):
    branch_id: uuid.UUID
    period_month: Annotated[int, Field(ge=1, le=12)]
    period_year: Annotated[int, Field(ge=2000, le=2100)]


class PayrollRunUpdate(APIModel):
    status: Annotated[str, Field(pattern="^(draft|calculated|verified|paid)$")] | None = None


class PayrollRecordRead(APIModel):
    id: uuid.UUID
    payroll_run_id: uuid.UUID
    employee_profile_id: uuid.UUID
    attendance_days: Decimal
    lwp_days: Decimal
    basic_salary_earned: Decimal
    gross_salary: Decimal
    pf_deduction: Decimal
    esi_deduction: Decimal
    pt_deduction: Decimal
    tds_deduction: Decimal
    other_deductions: Decimal
    net_salary: Decimal
    payslip_url: str | None = None
    paid_at: datetime | None = None


class SalaryBreakdown(APIModel):
    """A single employee's computed pay for one period."""

    employee_profile_id: uuid.UUID
    employee_name: str
    working_days: Decimal
    paid_days: Decimal
    lwp_days: Decimal
    basic_salary_earned: Decimal
    allowances: Decimal
    gross_salary: Decimal
    pf_employee: Decimal
    pf_employer: Decimal
    eps_employer: Decimal
    esi_employee: Decimal
    esi_employer: Decimal
    professional_tax: Decimal
    tds: Decimal
    other_deductions: Decimal
    total_deductions: Decimal
    net_salary: Decimal
    employer_cost: Decimal
    notes: list[str] = Field(default_factory=list)


class PayrollCalculationResult(APIModel):
    payroll_run_id: uuid.UUID
    period_month: int
    period_year: int
    financial_year: str
    state_code: str | None = None
    employee_count: int
    total_gross: Decimal
    total_deductions: Decimal
    total_net: Decimal
    total_employer_cost: Decimal
    breakdowns: list[SalaryBreakdown]
    warnings: list[str] = Field(default_factory=list)


# --- Statutory configuration -------------------------------------------------


class StatutoryConfigRead(APIModel):
    id: uuid.UUID
    financial_year: str
    state_code: str | None = None
    component: str
    employee_rate: Decimal | None = None
    employer_rate: Decimal | None = None
    wage_ceiling: Decimal | None = None
    wage_floor: Decimal | None = None
    slabs: list = Field(default_factory=list)
    effective_from: date
    effective_to: date | None = None
    is_active: bool
    notes: str | None = None


class StatutoryConfigCreate(APIModel):
    financial_year: Annotated[str, Field(pattern=r"^\d{4}-\d{2}$")]
    component: Annotated[
        str, Field(pattern="^(pf|eps|esi|professional_tax|tds|gratuity|lwf)$")
    ]
    effective_from: date
    state_code: Annotated[str, Field(max_length=10)] | None = None
    employee_rate: Annotated[Decimal, Field(ge=0, le=100, max_digits=6, decimal_places=3)] | None = None
    employer_rate: Annotated[Decimal, Field(ge=0, le=100, max_digits=6, decimal_places=3)] | None = None
    wage_ceiling: Money | None = None
    wage_floor: Money | None = None
    slabs: list[dict] = Field(default_factory=list)
    effective_to: date | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def _rates_or_slabs(self) -> StatutoryConfigCreate:
        if not self.slabs and self.employee_rate is None and self.employer_rate is None:
            raise ValueError("Provide either a rate or a slab table for this component.")
        if self.effective_to and self.effective_to < self.effective_from:
            raise ValueError("effective_to cannot precede effective_from.")
        return self


class StatutoryConfigUpdate(APIModel):
    employee_rate: Annotated[Decimal, Field(ge=0, le=100, max_digits=6, decimal_places=3)] | None = None
    employer_rate: Annotated[Decimal, Field(ge=0, le=100, max_digits=6, decimal_places=3)] | None = None
    wage_ceiling: Money | None = None
    slabs: list[dict] | None = None
    effective_to: date | None = None
    is_active: bool | None = None
    notes: str | None = None


# --- Invoicing ---------------------------------------------------------------


class InvoiceItemRead(APIModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    service_id: uuid.UUID | None = None
    description: str
    quantity: int
    unit_price: Decimal
    tax_rate_percent: Decimal
    tax_amount: Decimal
    total_amount: Decimal


class InvoiceItemCreate(APIModel):
    description: Annotated[str, Field(min_length=1)]
    quantity: Annotated[int, Field(ge=1, le=10000)] = 1
    unit_price: Money
    tax_rate_percent: Annotated[Decimal, Field(ge=0, le=100, max_digits=5, decimal_places=2)] = Decimal("18.00")
    service_id: uuid.UUID | None = None


class InvoiceRead(APIModel):
    id: uuid.UUID
    invoice_number: str
    client_id: uuid.UUID
    client_service_id: uuid.UUID | None = None
    branch_id: uuid.UUID
    issue_date: date
    due_date: date
    status: str
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    outstanding_amount: Decimal
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[InvoiceItemRead] = Field(default_factory=list)


class InvoiceCreate(APIModel):
    client_id: uuid.UUID
    branch_id: uuid.UUID
    due_date: date
    items: Annotated[list[InvoiceItemCreate], Field(min_length=1, max_length=200)]
    client_service_id: uuid.UUID | None = None
    issue_date: date | None = None
    discount_amount: Money = Decimal("0.00")
    notes: str | None = None

    @model_validator(mode="after")
    def _due_after_issue(self) -> InvoiceCreate:
        issued = self.issue_date or date.today()
        if self.due_date < issued:
            raise ValueError("The due date cannot precede the issue date.")
        return self


class InvoiceUpdate(APIModel):
    due_date: date | None = None
    status: Annotated[str, Field(pattern="^(" + "|".join(BILLING_STATUSES) + ")$")] | None = None
    notes: str | None = None
    discount_amount: Money | None = None


# --- Payments ----------------------------------------------------------------


class PaymentRead(APIModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    payment_number: str
    client_id: uuid.UUID
    amount: Decimal
    payment_date: date
    payment_method: str
    transaction_id: str | None = None
    status: str
    reconciliation_status: str
    reconciled_at: datetime | None = None
    created_at: datetime


class PaymentCreate(APIModel):
    invoice_id: uuid.UUID
    amount: Annotated[Decimal, Field(gt=0, max_digits=15, decimal_places=2)]
    payment_method: Annotated[str, Field(pattern="^(" + "|".join(PAYMENT_METHODS) + ")$")]
    payment_date: date | None = None
    transaction_id: Annotated[str, Field(max_length=100)] | None = None

    @model_validator(mode="after")
    def _reference_required_for_electronic(self) -> PaymentCreate:
        if self.payment_method != "cash" and not (self.transaction_id or "").strip():
            raise ValueError("A transaction reference is required for non-cash payments.")
        return self


class PaymentUpdate(APIModel):
    status: Annotated[str, Field(pattern="^(pending|cleared|failed|refunded)$")] | None = None
    transaction_id: Annotated[str, Field(max_length=100)] | None = None


class CreditNoteCreate(APIModel):
    invoice_id: uuid.UUID
    amount: Annotated[Decimal, Field(gt=0, max_digits=15, decimal_places=2)]
    reason: Annotated[str, Field(min_length=3)]


class CreditNoteRead(APIModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    credit_note_number: str
    amount: Decimal
    reason: str
    status: str
    created_at: datetime


class RefundCreate(APIModel):
    payment_id: uuid.UUID
    amount: Annotated[Decimal, Field(gt=0, max_digits=15, decimal_places=2)]
    reason: Annotated[str, Field(min_length=3)]


class RefundRead(APIModel):
    id: uuid.UUID
    payment_id: uuid.UUID
    refund_number: str
    amount: Decimal
    reason: str
    refund_date: date
    status: str
    approved_by: uuid.UUID | None = None
    created_at: datetime


class ReceivablesSummary(APIModel):
    total_invoiced: Decimal
    total_collected: Decimal
    total_outstanding: Decimal
    overdue_amount: Decimal
    overdue_count: int
    invoice_count: int
