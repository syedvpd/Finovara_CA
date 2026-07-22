"""Repositories for CRM, clients, and the service catalogue."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import func, select

from app.models.clients import (
    Client,
    ClientEntity,
    ClientKycDocument,
    ClientService,
    Consultation,
    Lead,
    Proposal,
    Service,
)
from app.repositories.base import BaseRepository


class LeadRepository(BaseRepository[Lead]):
    model = Lead
    searchable_fields = ("name", "email", "company_name", "phone")
    sortable_fields = ("name", "status", "source", "created_at", "updated_at")

    async def pipeline_counts(self) -> dict[str, int]:
        rows = await self.session.execute(select(Lead.status, func.count()).group_by(Lead.status))
        return {status: count for status, count in rows.all()}


class ConsultationRepository(BaseRepository[Consultation]):
    model = Consultation
    sortable_fields = ("scheduled_at", "status", "created_at")
    default_sort = "scheduled_at"

    async def upcoming(self, *, limit: int = 20) -> list[Consultation]:
        stmt = (
            self.base_query()
            .where(Consultation.status == "scheduled", Consultation.scheduled_at >= func.now())
            .order_by(Consultation.scheduled_at.asc())
            .limit(limit)
        )
        return list((await self.session.execute(stmt)).scalars().all())


class ProposalRepository(BaseRepository[Proposal]):
    model = Proposal
    searchable_fields = ("title",)
    sortable_fields = ("title", "status", "total_value", "created_at")


class ClientRepository(BaseRepository[Client]):
    model = Client
    searchable_fields = ("client_code",)
    sortable_fields = ("client_code", "status", "client_type", "created_at")
    client_column = "id"  # a client's own row is keyed by its id
    branch_column = "branch_id"

    async def get_by_user_id(self, user_id: UUID) -> Client | None:
        return await self.get_by(user_id=user_id)

    async def status_counts(self, branch_id: UUID | None = None) -> dict[str, int]:
        stmt = select(Client.status, func.count()).where(Client.deleted_at.is_(None))
        if branch_id:
            stmt = stmt.where(Client.branch_id == branch_id)
        rows = await self.session.execute(stmt.group_by(Client.status))
        return {status: count for status, count in rows.all()}


class ClientEntityRepository(BaseRepository[ClientEntity]):
    model = ClientEntity
    searchable_fields = ("legal_name", "trade_name", "pan", "gst_number")
    sortable_fields = ("legal_name", "entity_type", "created_at")
    client_column = "client_id"

    async def identifier_taken(
        self, field: str, value: str, *, exclude_id: UUID | None = None
    ) -> bool:
        """PAN/GSTIN/CIN must be unique across live entities."""
        column = getattr(ClientEntity, field)
        stmt = self.base_query().where(column == value)
        if exclude_id:
            stmt = stmt.where(ClientEntity.id != exclude_id)
        return (await self.session.execute(stmt)).scalars().first() is not None


class ClientKycRepository(BaseRepository[ClientKycDocument]):
    model = ClientKycDocument
    sortable_fields = ("document_type", "status", "created_at")
    client_column = "client_id"


class ServiceRepository(BaseRepository[Service]):
    model = Service
    searchable_fields = ("name", "code", "description", "department")
    sortable_fields = ("name", "code", "department", "base_price", "created_at")
    default_sort = "name"

    async def code_taken(self, code: str, *, exclude_id: UUID | None = None) -> bool:
        stmt = self.base_query().where(Service.code == code)
        if exclude_id:
            stmt = stmt.where(Service.id != exclude_id)
        return (await self.session.execute(stmt)).scalars().first() is not None


class ClientServiceRepository(BaseRepository[ClientService]):
    model = ClientService
    sortable_fields = ("start_date", "status", "price_agreed", "next_billing_date", "created_at")
    default_sort = "start_date"
    client_column = "client_id"

    async def active_engagement_exists(
        self, client_id: UUID, service_id: UUID, *, exclude_id: UUID | None = None
    ) -> bool:
        stmt = self.base_query().where(
            ClientService.client_id == client_id,
            ClientService.service_id == service_id,
            ClientService.status == "active",
        )
        if exclude_id:
            stmt = stmt.where(ClientService.id != exclude_id)
        return (await self.session.execute(stmt)).scalars().first() is not None

    async def due_for_billing(self, on_or_before: date) -> list[ClientService]:
        stmt = self.base_query().where(
            ClientService.status == "active",
            ClientService.next_billing_date.is_not(None),
            ClientService.next_billing_date <= on_or_before,
        )
        return list((await self.session.execute(stmt)).scalars().all())
