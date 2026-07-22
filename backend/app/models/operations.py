"""Compliance calendar, tasks, document vault, audit, and statutory filings."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy.orm import Mapped, relationship

from app.db.base import (
    created_ts,
    AuditMixin,
    Base,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    bigint_col,
    bool_col,
    date_col,
    fk,
    int_col,
    json_col,
    money_col,
    str_array_col,
    str_col,
    text_col,
    ts_col,
)

# --- Compliance --------------------------------------------------------------


class ComplianceType(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "compliance_types"

    name: Mapped[str] = str_col(100, unique=True)
    description: Mapped[str | None] = text_col()
    authority: Mapped[str] = str_col(50)
    frequency: Mapped[str] = str_col(30)


class ComplianceRule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Due-date and penalty formulas driving the calendar generator."""

    __tablename__ = "compliance_rules"

    compliance_type_id: Mapped[uuid.UUID] = fk("compliance_types.id")
    due_date_formula: Mapped[dict] = json_col()
    penalty_formula: Mapped[dict | None] = json_col(nullable=True)
    warning_days_before: Mapped[int] = int_col(default=7)


class ComplianceCalendarEntry(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "compliance_calendar"

    client_id: Mapped[uuid.UUID] = fk("clients.id")
    entity_id: Mapped[uuid.UUID | None] = fk("client_entities.id", nullable=True)
    compliance_type_id: Mapped[uuid.UUID] = fk("compliance_types.id", ondelete="RESTRICT")
    due_date: Mapped[date] = date_col(nullable=False)
    status: Mapped[str] = str_col(30, default="pending")
    filing_date: Mapped[date | None] = date_col()
    acknowledgement_number: Mapped[str | None] = str_col(100, nullable=True)
    tax_year: Mapped[str] = str_col(10)
    period: Mapped[str | None] = str_col(30, nullable=True)

    compliance_type: Mapped[ComplianceType] = relationship(lazy="joined", foreign_keys=[compliance_type_id])


# --- Tasks -------------------------------------------------------------------


class Task(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, AuditMixin):
    __tablename__ = "tasks"

    title: Mapped[str] = str_col(150)
    description: Mapped[str | None] = text_col()
    task_type: Mapped[str] = str_col(30)
    status: Mapped[str] = str_col(30, default="todo")
    priority: Mapped[str] = str_col(20, default="medium")
    due_date: Mapped[date | None] = date_col()
    client_id: Mapped[uuid.UUID] = fk("clients.id")
    service_assignment_id: Mapped[uuid.UUID | None] = fk("client_services.id", ondelete="SET NULL", nullable=True)
    branch_id: Mapped[uuid.UUID] = fk("branches.id", ondelete="RESTRICT")

    assignments: Mapped[list[TaskAssignment]] = relationship(
        back_populates="task", lazy="selectin", primaryjoin="Task.id == TaskAssignment.task_id"
    )


class TaskAssignment(Base, UUIDPrimaryKeyMixin):
    """Who does the work, who reviews it, who approves it."""

    __tablename__ = "task_assignments"

    task_id: Mapped[uuid.UUID] = fk("tasks.id")
    employee_id: Mapped[uuid.UUID] = fk("employees.id")
    role: Mapped[str] = str_col(30)
    assigned_at: Mapped[datetime] = created_ts()
    completed_at: Mapped[datetime | None] = ts_col()
    status: Mapped[str] = str_col(30, default="pending")
    created_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)

    task: Mapped[Task] = relationship(back_populates="assignments", foreign_keys=[task_id])


# --- Document vault ----------------------------------------------------------


class DocumentFolder(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "document_folders"

    parent_id: Mapped[uuid.UUID | None] = fk("document_folders.id", nullable=True)
    name: Mapped[str] = str_col(100)
    client_id: Mapped[uuid.UUID] = fk("clients.id")
    is_private: Mapped[bool] = bool_col(default=True)


class Document(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, AuditMixin):
    __tablename__ = "documents"

    client_id: Mapped[uuid.UUID] = fk("clients.id")
    folder_id: Mapped[uuid.UUID | None] = fk("document_folders.id", ondelete="SET NULL", nullable=True)
    name: Mapped[str] = str_col(255)
    description: Mapped[str | None] = text_col()
    file_path: Mapped[str] = text_col(nullable=False)
    file_size: Mapped[int] = bigint_col()
    mime_type: Mapped[str] = str_col(100)
    file_category: Mapped[str] = str_col(50)
    status: Mapped[str] = str_col(30, default="pending_verification")
    is_encrypted: Mapped[bool] = bool_col()
    tags: Mapped[list[str]] = str_array_col()
    version_count: Mapped[int] = int_col(default=1)
    verified_by: Mapped[uuid.UUID | None] = fk("employees.id", ondelete="SET NULL", nullable=True)
    verified_at: Mapped[datetime | None] = ts_col()


class DocumentVersion(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "document_versions"

    document_id: Mapped[uuid.UUID] = fk("documents.id")
    version_number: Mapped[int] = int_col()
    file_path: Mapped[str] = text_col(nullable=False)
    file_size: Mapped[int] = bigint_col()
    change_summary: Mapped[str | None] = text_col()
    created_at: Mapped[datetime] = created_ts()
    created_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)


class DocumentRequest(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A request to the client to supply a missing document."""

    __tablename__ = "document_requests"

    client_id: Mapped[uuid.UUID] = fk("clients.id")
    task_id: Mapped[uuid.UUID | None] = fk("tasks.id", ondelete="SET NULL", nullable=True)
    title: Mapped[str] = str_col(150)
    description: Mapped[str | None] = text_col()
    file_types_accepted: Mapped[list[str]] = str_array_col()
    due_date: Mapped[date | None] = date_col()
    status: Mapped[str] = str_col(30, default="pending")
    created_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
    updated_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)


class DocumentActionLog(Base, UUIDPrimaryKeyMixin):
    """Append-only access trail for every document interaction."""

    __tablename__ = "document_actions_log"

    document_id: Mapped[uuid.UUID] = fk("documents.id")
    user_id: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
    action_type: Mapped[str] = str_col(30)
    ip_address: Mapped[str | None] = str_col(45, nullable=True)
    user_agent: Mapped[str | None] = text_col()
    created_at: Mapped[datetime] = created_ts()


# --- Audit -------------------------------------------------------------------


class Audit(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, AuditMixin):
    __tablename__ = "audits"

    client_id: Mapped[uuid.UUID] = fk("clients.id")
    service_id: Mapped[uuid.UUID] = fk("services.id", ondelete="RESTRICT")
    start_date: Mapped[date] = date_col(nullable=False)
    end_date: Mapped[date | None] = date_col()
    audit_type: Mapped[str] = str_col(50)
    status: Mapped[str] = str_col(30, default="assigned")
    risk_rating: Mapped[str] = str_col(20, default="medium")

    observations: Mapped[list[AuditObservation]] = relationship(
        back_populates="audit", lazy="selectin", primaryjoin="Audit.id == AuditObservation.audit_id"
    )


class AuditChecklistItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "audit_checklists"

    audit_id: Mapped[uuid.UUID] = fk("audits.id")
    item_name: Mapped[str] = str_col(150)
    description: Mapped[str | None] = text_col()
    status: Mapped[str] = str_col(30, default="pending")
    verified_by: Mapped[uuid.UUID | None] = fk("employees.id", ondelete="SET NULL", nullable=True)
    verified_at: Mapped[datetime | None] = ts_col()


class AuditObservation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "audit_observations"

    audit_id: Mapped[uuid.UUID] = fk("audits.id")
    title: Mapped[str] = str_col(150)
    description: Mapped[str] = text_col(nullable=False)
    risk_level: Mapped[str] = str_col(20)
    status: Mapped[str] = str_col(30, default="open")
    created_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
    updated_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)

    audit: Mapped[Audit] = relationship(back_populates="observations", foreign_keys=[audit_id])
    responses: Mapped[list[AuditResponse]] = relationship(
        lazy="selectin", primaryjoin="AuditObservation.id == AuditResponse.observation_id"
    )


class AuditResponse(Base, UUIDPrimaryKeyMixin):
    """Management's reply to an observation."""

    __tablename__ = "audit_responses"

    observation_id: Mapped[uuid.UUID] = fk("audit_observations.id")
    responder_id: Mapped[uuid.UUID] = fk("users.id", ondelete="RESTRICT")
    response_text: Mapped[str] = text_col(nullable=False)
    responded_at: Mapped[datetime] = created_ts()
    created_at: Mapped[datetime] = created_ts()


# --- Statutory filings -------------------------------------------------------


class TaxReturn(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "tax_returns"

    client_id: Mapped[uuid.UUID] = fk("clients.id")
    entity_id: Mapped[uuid.UUID] = fk("client_entities.id", ondelete="RESTRICT")
    financial_year: Mapped[str] = str_col(10)
    assessment_year: Mapped[str] = str_col(10)
    return_type: Mapped[str] = str_col(30)
    status: Mapped[str] = str_col(50)
    calculated_taxable_income: Mapped[Decimal | None] = money_col(nullable=True, default=None)
    calculated_tax_liability: Mapped[Decimal | None] = money_col(nullable=True, default=None)
    tax_paid: Mapped[Decimal | None] = money_col(nullable=True, default=None)
    refund_claimed: Mapped[Decimal | None] = money_col(nullable=True, default=None)
    refund_status: Mapped[str | None] = str_col(30, nullable=True)
    acknowledgement_url: Mapped[str | None] = text_col()
    filed_at: Mapped[datetime | None] = ts_col()


class GstReturn(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "gst_returns"

    client_id: Mapped[uuid.UUID] = fk("clients.id")
    entity_id: Mapped[uuid.UUID] = fk("client_entities.id", ondelete="RESTRICT")
    period_month: Mapped[int | None] = int_col(nullable=True)
    period_year: Mapped[int] = int_col()
    return_type: Mapped[str] = str_col(30)
    status: Mapped[str] = str_col(50)
    liability_amount: Mapped[Decimal | None] = money_col(nullable=True, default=None)
    input_tax_credit: Mapped[Decimal | None] = money_col(nullable=True, default=None)
    late_fee_calculated: Mapped[Decimal | None] = money_col(nullable=True, default=None)
    late_fee_paid: Mapped[Decimal | None] = money_col(nullable=True, default=None)
    filed_at: Mapped[datetime | None] = ts_col()
