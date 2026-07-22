"""System settings, website contact requests, reports, and payroll rate config."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import (
    Base,
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


class AppSetting(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Operational configuration. Distinct from ``website_settings`` (public CMS)."""

    __tablename__ = "app_settings"

    key: Mapped[str] = str_col(100, unique=True)
    value: Mapped[dict | list | str | int | float | bool] = json_col()
    category: Mapped[str] = str_col(50, default="general")
    description: Mapped[str | None] = text_col()
    is_sensitive: Mapped[bool] = bool_col()
    updated_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)


class ContactRequest(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "contact_requests"

    name: Mapped[str] = str_col(150)
    email: Mapped[str] = str_col(320)
    phone: Mapped[str | None] = str_col(20, nullable=True)
    subject: Mapped[str | None] = str_col(200, nullable=True)
    message: Mapped[str] = text_col(nullable=False)
    service_id: Mapped[uuid.UUID | None] = fk("services.id", ondelete="SET NULL", nullable=True)
    source: Mapped[str] = str_col(50, default="website")
    status: Mapped[str] = str_col(30, default="new")
    lead_id: Mapped[uuid.UUID | None] = fk("leads.id", ondelete="SET NULL", nullable=True)
    handled_by: Mapped[uuid.UUID | None] = fk("employees.id", ondelete="SET NULL", nullable=True)
    handled_at: Mapped[datetime | None] = ts_col()
    ip_address: Mapped[str | None] = str_col(45, nullable=True)


class ReportTemplate(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "report_templates"

    name: Mapped[str] = str_col(150, unique=True)
    code: Mapped[str] = str_col(50, unique=True)
    module: Mapped[str] = str_col(50)
    description: Mapped[str | None] = text_col()
    parameters: Mapped[dict] = json_col(default=dict)
    output_formats: Mapped[list[str]] = str_array_col()


class Report(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A generated artefact. The file itself lives in object storage."""

    __tablename__ = "reports"

    template_id: Mapped[uuid.UUID | None] = fk("report_templates.id", ondelete="SET NULL", nullable=True)
    client_id: Mapped[uuid.UUID | None] = fk("clients.id", nullable=True)
    branch_id: Mapped[uuid.UUID | None] = fk("branches.id", ondelete="RESTRICT", nullable=True)
    title: Mapped[str] = str_col(200)
    report_type: Mapped[str] = str_col(50)
    parameters: Mapped[dict] = json_col(default=dict)
    period_start: Mapped[date | None] = date_col()
    period_end: Mapped[date | None] = date_col()
    format: Mapped[str] = str_col(10, default="pdf")
    status: Mapped[str] = str_col(30, default="queued")
    file_path: Mapped[str | None] = text_col()
    file_size: Mapped[int | None] = bigint_col(nullable=True)
    error_message: Mapped[str | None] = text_col()
    generated_at: Mapped[datetime | None] = ts_col()
    expires_at: Mapped[datetime | None] = ts_col()
    is_shared_with_client: Mapped[bool] = bool_col()
    created_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)


class PayrollAttendance(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "payroll_attendance"

    employee_profile_id: Mapped[uuid.UUID] = fk("employee_payroll_profiles.id")
    period_month: Mapped[int] = int_col()
    period_year: Mapped[int] = int_col()
    working_days: Mapped[Decimal] = mapped_column(Numeric(4, 1), nullable=False)
    present_days: Mapped[Decimal] = mapped_column(Numeric(4, 1), nullable=False)
    paid_leave_days: Mapped[Decimal] = mapped_column(Numeric(4, 1), nullable=False, default=Decimal("0.0"))
    lwp_days: Mapped[Decimal] = mapped_column(Numeric(4, 1), nullable=False, default=Decimal("0.0"))
    overtime_hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("0.00"))
    source: Mapped[str] = str_col(30, default="manual")
    created_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)


class PayrollStatutoryConfig(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Effective-dated statutory rates.

    Rates are data, never constants: they change each budget and Professional
    Tax differs by state. ``state_code`` NULL is the national default.
    """

    __tablename__ = "payroll_statutory_config"

    financial_year: Mapped[str] = str_col(10)
    state_code: Mapped[str | None] = str_col(10, nullable=True)
    component: Mapped[str] = str_col(30)
    employee_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 3), nullable=True)
    employer_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 3), nullable=True)
    wage_ceiling: Mapped[Decimal | None] = money_col(nullable=True, default=None)
    wage_floor: Mapped[Decimal | None] = money_col(nullable=True, default=None)
    slabs: Mapped[list] = json_col(default=list)
    effective_from: Mapped[date] = date_col(nullable=False)
    effective_to: Mapped[date | None] = date_col()
    is_active: Mapped[bool] = bool_col(default=True)
    notes: Mapped[str | None] = text_col()
    updated_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
