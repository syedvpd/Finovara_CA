"""Schemas for documents, tasks, compliance, audit, and statutory filings."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import Field, model_validator

from app.core.constants import (
    DOCUMENT_CATEGORIES,
    DOCUMENT_STATUSES,
    GST_RETURN_TYPES,
    TASK_STATUSES,
)
from app.schemas.common import APIModel

Money = Annotated[Decimal, Field(ge=0, max_digits=15, decimal_places=2)]
FY = Annotated[str, Field(pattern=r"^\d{4}-\d{2}$", description="Financial year, e.g. 2025-26")]


def _one_of(values: tuple[str, ...]) -> str:
    return "^(" + "|".join(values) + ")$"


# --- Documents ---------------------------------------------------------------


class DocumentRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID
    folder_id: uuid.UUID | None = None
    name: str
    description: str | None = None
    file_size: int
    mime_type: str
    file_category: str
    status: str
    tags: list[str] = Field(default_factory=list)
    version_count: int
    verified_by: uuid.UUID | None = None
    verified_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    # file_path is deliberately omitted: clients receive signed URLs, never
    # the raw storage key.


class DocumentUpdate(APIModel):
    name: Annotated[str, Field(min_length=1, max_length=255)] | None = None
    description: str | None = None
    folder_id: uuid.UUID | None = None
    tags: Annotated[list[str], Field(max_length=20)] | None = None
    file_category: Annotated[str, Field(pattern=_one_of(DOCUMENT_CATEGORIES))] | None = None


class DocumentVerify(APIModel):
    status: Annotated[str, Field(pattern="^(verified|rejected)$")]
    reason: str | None = None

    @model_validator(mode="after")
    def _reason_required_on_reject(self) -> DocumentVerify:
        if self.status == "rejected" and not (self.reason or "").strip():
            raise ValueError("A reason is required when rejecting a document.")
        return self


class DocumentVersionRead(APIModel):
    id: uuid.UUID
    document_id: uuid.UUID
    version_number: int
    file_size: int
    change_summary: str | None = None
    created_at: datetime
    created_by: uuid.UUID | None = None


class SignedUrlResponse(APIModel):
    url: str
    expires_in: int
    filename: str


class DocumentFolderRead(APIModel):
    id: uuid.UUID
    parent_id: uuid.UUID | None = None
    name: str
    client_id: uuid.UUID
    is_private: bool
    created_at: datetime


class DocumentFolderCreate(APIModel):
    client_id: uuid.UUID
    name: Annotated[str, Field(min_length=1, max_length=100)]
    parent_id: uuid.UUID | None = None
    is_private: bool = True


class DocumentRequestRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID
    task_id: uuid.UUID | None = None
    title: str
    description: str | None = None
    file_types_accepted: list[str] = Field(default_factory=list)
    due_date: date | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class DocumentRequestCreate(APIModel):
    client_id: uuid.UUID
    title: Annotated[str, Field(min_length=2, max_length=150)]
    description: str | None = None
    task_id: uuid.UUID | None = None
    file_types_accepted: list[str] = Field(default_factory=list)
    due_date: date | None = None


class DocumentRequestUpdate(APIModel):
    title: Annotated[str, Field(min_length=2, max_length=150)] | None = None
    description: str | None = None
    due_date: date | None = None
    status: Annotated[str, Field(pattern="^(pending|fulfilled|overdue)$")] | None = None


# --- Tasks -------------------------------------------------------------------


class TaskAssignmentRead(APIModel):
    id: uuid.UUID
    task_id: uuid.UUID
    employee_id: uuid.UUID
    role: str
    assigned_at: datetime
    completed_at: datetime | None = None
    status: str


class TaskRead(APIModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    task_type: str
    status: str
    priority: str
    due_date: date | None = None
    client_id: uuid.UUID
    service_assignment_id: uuid.UUID | None = None
    branch_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    assignments: list[TaskAssignmentRead] = Field(default_factory=list)


class TaskCreate(APIModel):
    title: Annotated[str, Field(min_length=2, max_length=150)]
    description: str | None = None
    task_type: Annotated[str, Field(pattern="^(audit|gst|tax|payroll|general)$")]
    priority: Annotated[str, Field(pattern="^(low|medium|high|urgent)$")] = "medium"
    due_date: date | None = None
    client_id: uuid.UUID
    service_assignment_id: uuid.UUID | None = None
    branch_id: uuid.UUID


class TaskUpdate(APIModel):
    title: Annotated[str, Field(min_length=2, max_length=150)] | None = None
    description: str | None = None
    status: Annotated[str, Field(pattern=_one_of(TASK_STATUSES))] | None = None
    priority: Annotated[str, Field(pattern="^(low|medium|high|urgent)$")] | None = None
    due_date: date | None = None


class TaskAssign(APIModel):
    employee_id: uuid.UUID
    role: Annotated[str, Field(pattern="^(assignee|reviewer|approver)$")] = "assignee"


# --- Compliance --------------------------------------------------------------


class ComplianceTypeRead(APIModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    authority: str
    frequency: str
    created_at: datetime


class ComplianceTypeCreate(APIModel):
    name: Annotated[str, Field(min_length=2, max_length=100)]
    description: str | None = None
    authority: Annotated[str, Field(pattern="^(income_tax|gst|mca|pf_esi|other)$")]
    frequency: Annotated[str, Field(pattern="^(monthly|quarterly|annually|one_time)$")]


class ComplianceEntryRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID
    entity_id: uuid.UUID | None = None
    compliance_type_id: uuid.UUID
    due_date: date
    status: str
    filing_date: date | None = None
    acknowledgement_number: str | None = None
    tax_year: str
    period: str | None = None
    created_at: datetime
    compliance_type: ComplianceTypeRead | None = None


class ComplianceEntryCreate(APIModel):
    client_id: uuid.UUID
    compliance_type_id: uuid.UUID
    due_date: date
    tax_year: FY
    entity_id: uuid.UUID | None = None
    period: Annotated[str, Field(max_length=30)] | None = None


class ComplianceEntryUpdate(APIModel):
    due_date: date | None = None
    status: Annotated[str, Field(pattern="^(pending|filed|overdue|waived)$")] | None = None
    filing_date: date | None = None
    acknowledgement_number: Annotated[str, Field(max_length=100)] | None = None

    @model_validator(mode="after")
    def _filed_requires_evidence(self) -> ComplianceEntryUpdate:
        if self.status == "filed" and not self.filing_date:
            raise ValueError("A filing date is required when marking a compliance item filed.")
        return self


# --- Audit -------------------------------------------------------------------


class AuditRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID
    service_id: uuid.UUID
    start_date: date
    end_date: date | None = None
    audit_type: str
    status: str
    risk_rating: str
    created_at: datetime
    updated_at: datetime


class AuditCreate(APIModel):
    client_id: uuid.UUID
    service_id: uuid.UUID
    start_date: date
    end_date: date | None = None
    audit_type: Annotated[
        str, Field(pattern="^(statutory|internal|tax|stock|concurrent|process|compliance|management)$")
    ]
    risk_rating: Annotated[str, Field(pattern="^(low|medium|high)$")] = "medium"

    @model_validator(mode="after")
    def _dates_ordered(self) -> AuditCreate:
        if self.end_date and self.end_date < self.start_date:
            raise ValueError("The audit end date cannot precede its start date.")
        return self


class AuditUpdate(APIModel):
    end_date: date | None = None
    status: str | None = None
    risk_rating: Annotated[str, Field(pattern="^(low|medium|high)$")] | None = None


class AuditChecklistRead(APIModel):
    id: uuid.UUID
    audit_id: uuid.UUID
    item_name: str
    description: str | None = None
    status: str
    verified_by: uuid.UUID | None = None
    verified_at: datetime | None = None


class AuditChecklistCreate(APIModel):
    audit_id: uuid.UUID
    item_name: Annotated[str, Field(min_length=2, max_length=150)]
    description: str | None = None


class AuditChecklistUpdate(APIModel):
    status: Annotated[str, Field(pattern="^(pending|completed|not_applicable)$")] | None = None
    description: str | None = None


class AuditResponseRead(APIModel):
    id: uuid.UUID
    observation_id: uuid.UUID
    responder_id: uuid.UUID
    response_text: str
    responded_at: datetime


class AuditObservationRead(APIModel):
    id: uuid.UUID
    audit_id: uuid.UUID
    title: str
    description: str
    risk_level: str
    status: str
    created_at: datetime
    updated_at: datetime
    responses: list[AuditResponseRead] = Field(default_factory=list)


class AuditObservationCreate(APIModel):
    audit_id: uuid.UUID
    title: Annotated[str, Field(min_length=2, max_length=150)]
    description: Annotated[str, Field(min_length=1)]
    risk_level: Annotated[str, Field(pattern="^(low|medium|high)$")]


class AuditObservationUpdate(APIModel):
    title: Annotated[str, Field(min_length=2, max_length=150)] | None = None
    description: str | None = None
    risk_level: Annotated[str, Field(pattern="^(low|medium|high)$")] | None = None
    status: Annotated[str, Field(pattern="^(open|management_responded|resolved|closed)$")] | None = None


class AuditResponseCreate(APIModel):
    response_text: Annotated[str, Field(min_length=1)]


# --- Income tax --------------------------------------------------------------


class TaxReturnRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID
    entity_id: uuid.UUID
    financial_year: str
    assessment_year: str
    return_type: str
    status: str
    calculated_taxable_income: Decimal | None = None
    calculated_tax_liability: Decimal | None = None
    tax_paid: Decimal | None = None
    refund_claimed: Decimal | None = None
    refund_status: str | None = None
    acknowledgement_url: str | None = None
    filed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class TaxReturnCreate(APIModel):
    client_id: uuid.UUID
    entity_id: uuid.UUID
    financial_year: FY
    return_type: Annotated[str, Field(max_length=30)]
    # assessment_year is derived from the financial year, never supplied.


class TaxReturnUpdate(APIModel):
    status: str | None = None
    calculated_taxable_income: Money | None = None
    calculated_tax_liability: Money | None = None
    tax_paid: Money | None = None
    refund_claimed: Money | None = None
    refund_status: Annotated[str, Field(pattern="^(pending|received|adjusted)$")] | None = None
    acknowledgement_url: str | None = None


# --- GST ---------------------------------------------------------------------


class GstReturnRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID
    entity_id: uuid.UUID
    period_month: int | None = None
    period_year: int
    return_type: str
    status: str
    liability_amount: Decimal | None = None
    input_tax_credit: Decimal | None = None
    late_fee_calculated: Decimal | None = None
    late_fee_paid: Decimal | None = None
    filed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class GstReturnCreate(APIModel):
    client_id: uuid.UUID
    entity_id: uuid.UUID
    period_year: Annotated[int, Field(ge=2017, le=2100)]
    return_type: Annotated[str, Field(pattern=_one_of(GST_RETURN_TYPES))]
    period_month: Annotated[int, Field(ge=1, le=12)] | None = None

    @model_validator(mode="after")
    def _period_matches_return_type(self) -> GstReturnCreate:
        annual = self.return_type in ("gstr_9", "gstr_9c")
        if annual and self.period_month is not None:
            raise ValueError("Annual returns must not specify a month.")
        if not annual and self.period_month is None:
            raise ValueError("Monthly returns require a period month.")
        return self


class GstReturnUpdate(APIModel):
    status: str | None = None
    liability_amount: Money | None = None
    input_tax_credit: Money | None = None
    late_fee_paid: Money | None = None


class GstReconciliationResult(APIModel):
    """Outcome of matching declared sales/purchases against the portal."""

    gst_return_id: uuid.UUID
    output_tax: Decimal
    input_tax_credit: Decimal
    net_liability: Decimal
    late_fee: Decimal
    days_late: int
    is_late: bool
