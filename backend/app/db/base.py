"""Declarative base and shared column mixins.

The Supabase migrations own the schema. These models map onto the existing
tables; they are never used to generate DDL.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from decimal import Decimal
from typing import Any

from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION, schema="public")


class UUIDPrimaryKeyMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class SoftDeleteMixin:
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None


class AuditMixin:
    """created_by / updated_by / deleted_by actor columns."""

    @staticmethod
    def _actor_column() -> Mapped[uuid.UUID | None]:
        return mapped_column(
            PGUUID(as_uuid=True), ForeignKey("public.users.id", ondelete="SET NULL"), nullable=True
        )

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("public.users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("public.users.id", ondelete="SET NULL"), nullable=True
    )
    deleted_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("public.users.id", ondelete="SET NULL"), nullable=True
    )


class ActiveFlagMixin:
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


# --- Column shorthands -------------------------------------------------------
# The Supabase migrations are authoritative for DDL; these helpers keep the
# mapping declarations terse and consistent across ~50 tables.

def fk(target: str, *, ondelete: str = "CASCADE", nullable: bool = False, **kw: Any) -> Any:
    """Foreign key to ``public.<target>`` (e.g. ``"clients.id"``)."""
    return mapped_column(
        PGUUID(as_uuid=True), ForeignKey(f"public.{target}", ondelete=ondelete), nullable=nullable, **kw
    )


def uuid_col(*, nullable: bool = False, **kw: Any) -> Any:
    return mapped_column(PGUUID(as_uuid=True), nullable=nullable, **kw)


def str_col(length: int, *, nullable: bool = False, **kw: Any) -> Any:
    return mapped_column(String(length), nullable=nullable, **kw)


def text_col(*, nullable: bool = True, **kw: Any) -> Any:
    return mapped_column(Text, nullable=nullable, **kw)


def money_col(*, nullable: bool = False, default: str | None = "0.00", **kw: Any) -> Any:
    """numeric(15,2) — every monetary amount in the schema.

    ``default=None`` maps a genuinely optional amount (e.g. an uncalculated tax
    liability) rather than defaulting it to zero, which would be a lie.
    """
    return mapped_column(
        Numeric(15, 2), nullable=nullable, default=Decimal(default) if default is not None else None, **kw
    )


def int_col(*, nullable: bool = False, **kw: Any) -> Any:
    return mapped_column(Integer, nullable=nullable, **kw)


def bigint_col(*, nullable: bool = False, **kw: Any) -> Any:
    return mapped_column(BigInteger, nullable=nullable, **kw)


def bool_col(*, default: bool = False, **kw: Any) -> Any:
    return mapped_column(Boolean, nullable=False, default=default, **kw)


def date_col(*, nullable: bool = True, **kw: Any) -> Any:
    return mapped_column(Date, nullable=nullable, **kw)


def ts_col(*, nullable: bool = True, **kw: Any) -> Any:
    return mapped_column(DateTime(timezone=True), nullable=nullable, **kw)


def created_ts(**kw: Any) -> Any:
    """A NOT NULL created_at backed by the database's own default.

    Without server_default SQLAlchemy emits an explicit NULL for the column
    when the caller does not set it, which violates the NOT NULL constraint
    even though the table has DEFAULT now().
    """
    return mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), **kw
    )


def json_col(*, nullable: bool = False, **kw: Any) -> Any:
    return mapped_column(JSONB, nullable=nullable, **kw)


def str_array_col(**kw: Any) -> Any:
    return mapped_column(ARRAY(Text), nullable=False, default=list, **kw)
