"""CRM pipeline, client master data, and the service catalogue."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy.orm import Mapped, relationship

from app.db.base import (
    AuditMixin,
    Base,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    date_col,
    fk,
    json_col,
    money_col,
    str_col,
    text_col,
    ts_col,
)


class Lead(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "leads"

    name: Mapped[str] = str_col(150)
    email: Mapped[str] = str_col(320)
    phone: Mapped[str] = str_col(20)
    company_name: Mapped[str | None] = str_col(150, nullable=True)
    source: Mapped[str] = str_col(50)
    status: Mapped[str] = str_col(30, default="new")
    assigned_rm_id: Mapped[uuid.UUID | None] = fk("employees.id", ondelete="SET NULL", nullable=True)
    notes: Mapped[str | None] = text_col()
    created_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
    updated_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)


class Consultation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "consultations"

    lead_id: Mapped[uuid.UUID] = fk("leads.id")
    scheduled_at: Mapped[datetime] = ts_col(nullable=False)
    status: Mapped[str] = str_col(30, default="scheduled")
    notes: Mapped[str | None] = text_col()
    created_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
    updated_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)


class Proposal(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "proposals"

    lead_id: Mapped[uuid.UUID] = fk("leads.id")
    title: Mapped[str] = str_col(150)
    status: Mapped[str] = str_col(30, default="draft")
    total_value: Mapped[Decimal] = money_col()
    content: Mapped[dict] = json_col()
    sent_at: Mapped[datetime | None] = ts_col()
    accepted_at: Mapped[datetime | None] = ts_col()
    created_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
    updated_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)


class Client(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, AuditMixin):
    __tablename__ = "clients"

    user_id: Mapped[uuid.UUID] = fk("users.id", unique=True)
    client_code: Mapped[str] = str_col(30)
    branch_id: Mapped[uuid.UUID] = fk("branches.id", ondelete="RESTRICT")
    relationship_manager_id: Mapped[uuid.UUID | None] = fk("employees.id", ondelete="SET NULL", nullable=True)
    client_type: Mapped[str] = str_col(30)
    status: Mapped[str] = str_col(20, default="active")

    entities: Mapped[list[ClientEntity]] = relationship(
        back_populates="client", lazy="selectin", primaryjoin="Client.id == ClientEntity.client_id"
    )


class ClientEntity(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """A legal entity belonging to a client; filings hang off entities, not clients."""

    __tablename__ = "client_entities"

    client_id: Mapped[uuid.UUID] = fk("clients.id")
    legal_name: Mapped[str] = str_col(150)
    trade_name: Mapped[str | None] = str_col(150, nullable=True)
    entity_type: Mapped[str] = str_col(50)
    pan: Mapped[str | None] = str_col(10, nullable=True)
    gst_number: Mapped[str | None] = str_col(15, nullable=True)
    cin: Mapped[str | None] = str_col(21, nullable=True)
    registered_address: Mapped[str] = text_col(nullable=False)
    billing_address: Mapped[str | None] = text_col()
    date_of_incorporation: Mapped[date | None] = date_col()

    client: Mapped[Client] = relationship(back_populates="entities", foreign_keys=[client_id])


class ClientKycDocument(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "client_documents_kyc"

    client_id: Mapped[uuid.UUID] = fk("clients.id")
    document_type: Mapped[str] = str_col(50)
    document_url: Mapped[str] = text_col(nullable=False)
    status: Mapped[str] = str_col(30, default="pending")
    verified_by: Mapped[uuid.UUID | None] = fk("employees.id", ondelete="SET NULL", nullable=True)
    verified_at: Mapped[datetime | None] = ts_col()
    rejection_reason: Mapped[str | None] = text_col()
    created_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
    updated_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)


class Service(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, AuditMixin):
    __tablename__ = "services"

    name: Mapped[str] = str_col(150, unique=True)
    code: Mapped[str] = str_col(50, unique=True)
    description: Mapped[str | None] = text_col()
    department: Mapped[str] = str_col(50)
    base_price: Mapped[Decimal] = money_col()
    billing_cycle: Mapped[str] = str_col(30)


class ClientService(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """An engagement: one service sold to one client."""

    __tablename__ = "client_services"

    client_id: Mapped[uuid.UUID] = fk("clients.id")
    service_id: Mapped[uuid.UUID] = fk("services.id", ondelete="RESTRICT")
    status: Mapped[str] = str_col(30, default="active")
    start_date: Mapped[date] = date_col(nullable=False)
    end_date: Mapped[date | None] = date_col()
    price_agreed: Mapped[Decimal] = money_col()
    billing_cycle: Mapped[str] = str_col(30)
    next_billing_date: Mapped[date | None] = date_col()
    created_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
    updated_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)

    service: Mapped[Service] = relationship(lazy="joined", foreign_keys=[service_id])
