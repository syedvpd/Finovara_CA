"""Reference data: financial years, content categories, document taxonomy."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy.orm import Mapped

from app.db.base import (
    Base,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    bool_col,
    date_col,
    fk,
    int_col,
    str_array_col,
    str_col,
    text_col,
    ts_col,
)


class FinancialYear(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """An Indian financial year (April–March) with period locking.

    A locked year rejects new vouchers and invoices at the database level, so
    closed books cannot move regardless of which caller attempts it.
    """

    __tablename__ = "financial_years"

    code: Mapped[str] = str_col(10, unique=True)
    label: Mapped[str] = str_col(50)
    assessment_year: Mapped[str] = str_col(10)
    start_date: Mapped[date] = date_col(nullable=False)
    end_date: Mapped[date] = date_col(nullable=False)
    is_current: Mapped[bool] = bool_col()
    is_locked: Mapped[bool] = bool_col()
    locked_at: Mapped[datetime | None] = ts_col()
    locked_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)


class Category(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Content taxonomy for blogs, downloads, FAQs and services."""

    __tablename__ = "categories"

    name: Mapped[str] = str_col(100)
    slug: Mapped[str] = str_col(120, unique=True)
    description: Mapped[str | None] = text_col()
    kind: Mapped[str] = str_col(30, default="blog")
    parent_id: Mapped[uuid.UUID | None] = fk("categories.id", ondelete="SET NULL", nullable=True)
    display_order: Mapped[int] = int_col(default=0)
    is_active: Mapped[bool] = bool_col(default=True)


class DocumentCategory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """The document-vault taxonomy.

    Data rather than a CHECK constraint, so the firm can add a category without
    a migration and each one can name its own bucket and accepted types.
    """

    __tablename__ = "document_categories"

    code: Mapped[str] = str_col(50, unique=True)
    name: Mapped[str] = str_col(100)
    description: Mapped[str | None] = text_col()
    bucket: Mapped[str] = str_col(50, default="client-documents")
    is_kyc: Mapped[bool] = bool_col()
    is_required: Mapped[bool] = bool_col()
    accepted_types: Mapped[list[str]] = str_array_col()
    display_order: Mapped[int] = int_col(default=0)
    is_active: Mapped[bool] = bool_col(default=True)
