"""Business rules for CRM, client onboarding, and engagements."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    AlreadyExistsError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.core.permissions import Action, Module
from app.core.security import AuthContext
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
from app.repositories.clients import (
    ClientEntityRepository,
    ClientKycRepository,
    ClientRepository,
    ClientServiceRepository,
    ConsultationRepository,
    LeadRepository,
    ProposalRepository,
    ServiceRepository,
)
from app.repositories.identity import BranchRepository, EmployeeRepository, UserRepository
from app.services.base import BaseService
from app.utils.dates import next_billing_date


class LeadService(BaseService[Lead, LeadRepository]):
    module = Module.LEADS
    # Mirrors the documented CRM pipeline: a lead may always be lost.
    transitions = {
        "new": {"contacted", "lost"},
        "contacted": {"consultation_scheduled", "proposal_sent", "lost"},
        "consultation_scheduled": {"proposal_sent", "contacted", "lost"},
        "proposal_sent": {"onboarding", "lost"},
        "onboarding": {"won", "lost"},
        "won": set(),
        "lost": {"contacted"},
    }

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if rm_id := data.get("assigned_rm_id"):
            if await EmployeeRepository(self.repo.session).get(rm_id) is None:
                raise NotFoundError("Employee", rm_id)
        return data

    async def pipeline_summary(self, auth: AuthContext) -> dict[str, int]:
        """Lead counts by stage, for the CRM dashboard."""
        self._require(auth, Action.READ)
        counts = await self.repo.pipeline_counts()
        # Report every stage, including the empty ones, so the UI is stable.
        return {stage: counts.get(stage, 0) for stage in self.transitions}


class ConsultationService(BaseService[Consultation, ConsultationRepository]):
    module = Module.CONSULTATIONS
    transitions = {
        "scheduled": {"completed", "cancelled", "no_show"},
        "completed": set(),
        "cancelled": {"scheduled"},
        "no_show": {"scheduled"},
    }

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if await LeadRepository(self.repo.session).get(data["lead_id"]) is None:
            raise NotFoundError("Lead", data["lead_id"])
        if data["scheduled_at"] < datetime.now(timezone.utc):
            raise ValidationError("A consultation cannot be scheduled in the past.")
        return data

    async def _after_create(self, entity: Consultation, auth: AuthContext) -> None:
        # Booking a consultation advances the pipeline automatically.
        lead_repo = LeadRepository(self.repo.session)
        lead = await lead_repo.get(entity.lead_id)
        if lead and lead.status in ("new", "contacted"):
            await lead_repo.update(lead, {"status": "consultation_scheduled"}, actor_id=auth.user_id)


class ProposalService(BaseService[Proposal, ProposalRepository]):
    module = Module.PROPOSALS
    transitions = {
        "draft": {"sent"},
        "sent": {"accepted", "rejected", "expired"},
        "accepted": set(),
        "rejected": set(),
        "expired": {"sent"},
    }

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if await LeadRepository(self.repo.session).get(data["lead_id"]) is None:
            raise NotFoundError("Lead", data["lead_id"])
        return data

    async def _before_update(self, entity: Proposal, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        status = data.get("status")
        now = datetime.now(timezone.utc)
        if status == "sent":
            data.setdefault("sent_at", now)
        elif status == "accepted":
            data.setdefault("accepted_at", now)
        return data

    async def _after_update(self, entity: Proposal, auth: AuthContext) -> None:
        if entity.status != "accepted":
            return
        lead_repo = LeadRepository(self.repo.session)
        lead = await lead_repo.get(entity.lead_id)
        if lead and lead.status == "proposal_sent":
            await lead_repo.update(lead, {"status": "onboarding"}, actor_id=auth.user_id)


class ClientService_(BaseService[Client, ClientRepository]):
    """Client master data. Trailing underscore avoids clashing with the
    ``ClientService`` model, which represents an engagement."""

    module = Module.CLIENTS
    transitions = {
        "active": {"inactive", "suspended"},
        "inactive": {"active"},
        "suspended": {"active", "inactive"},
    }

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        session = self.repo.session

        if await UserRepository(session).get(data["user_id"]) is None:
            raise NotFoundError("User", data["user_id"])
        if await self.repo.exists(user_id=data["user_id"]):
            raise AlreadyExistsError("This user already has a client profile.")
        if await BranchRepository(session).get(data["branch_id"]) is None:
            raise NotFoundError("Branch", data["branch_id"])
        if rm_id := data.get("relationship_manager_id"):
            if await EmployeeRepository(session).get(rm_id) is None:
                raise NotFoundError("Employee", rm_id)

        # client_code is issued by a database trigger, never by the caller.
        data.pop("client_code", None)
        return data

    async def _before_update(self, entity: Client, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        data.pop("client_code", None)
        if "branch_id" in data and not auth.is_admin:
            raise ForbiddenError("Only an administrator may move a client between branches.")
        return data

    async def _before_delete(self, entity: Client, auth: AuthContext) -> None:
        engagements = ClientServiceRepository(self.repo.session)
        if await engagements.exists(client_id=entity.id, status="active"):
            raise ConflictError(
                "This client still has active engagements. Close them before removing the client."
            )

    async def convert_lead(self, lead_id: UUID, data: dict[str, Any], auth: AuthContext) -> Client:
        """Lead -> Client, the documented onboarding step.

        The lead is only marked won once the client row exists, so a failure
        cannot leave a 'won' lead with no client behind it.
        """
        self._require(auth, Action.CREATE)

        lead_repo = LeadRepository(self.repo.session)
        lead = await lead_repo.get(lead_id)
        if lead is None:
            raise NotFoundError("Lead", lead_id)
        if lead.status == "won":
            raise ConflictError("This lead has already been converted.")
        if lead.status == "lost":
            raise ConflictError("A lost lead cannot be converted; reopen it first.")

        payload = dict(data)
        payload.setdefault("relationship_manager_id", lead.assigned_rm_id)
        client = await self.create(payload, auth)

        await lead_repo.update(lead, {"status": "won"}, actor_id=auth.user_id)
        return client


class ClientEntityService(BaseService[ClientEntity, ClientEntityRepository]):
    module = Module.CLIENTS

    async def _validate_identifiers(self, data: dict[str, Any], exclude_id: UUID | None = None) -> None:
        for field, label in (("pan", "PAN"), ("gst_number", "GST number"), ("cin", "CIN")):
            value = data.get(field)
            if value and await self.repo.identifier_taken(field, value, exclude_id=exclude_id):
                raise AlreadyExistsError(f"Another entity is already registered with this {label}.")

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if await ClientRepository(self.repo.session).get(data["client_id"]) is None:
            raise NotFoundError("Client", data["client_id"])
        await self._validate_identifiers(data)
        return data

    async def _before_update(
        self, entity: ClientEntity, data: dict[str, Any], auth: AuthContext
    ) -> dict[str, Any]:
        await self._validate_identifiers(data, exclude_id=entity.id)
        return data


class ClientKycService(BaseService[ClientKycDocument, ClientKycRepository]):
    module = Module.CLIENTS

    async def verify(self, kyc_id: UUID, decision: dict[str, Any], auth: AuthContext) -> ClientKycDocument:
        """Approve or reject a KYC document. Staff only — a client must never
        be able to verify their own identity documents."""
        self._require(auth, Action.UPDATE)
        if not auth.is_staff:
            raise ForbiddenError("Only firm personnel may verify KYC documents.")
        if auth.employee_id is None:
            raise ForbiddenError("No employee profile is linked to this account.")

        document = await self.repo.get_scoped_or_404(kyc_id, auth)
        if document.status != "pending":
            raise ConflictError(f"This document has already been {document.status}.")

        return await self.repo.update(
            document,
            {
                "status": decision["status"],
                "rejection_reason": decision.get("rejection_reason"),
                "verified_by": auth.employee_id,
                "verified_at": datetime.now(timezone.utc),
            },
            actor_id=auth.user_id,
        )


class ServiceCatalogService(BaseService[Service, ServiceRepository]):
    module = Module.SERVICES

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if await self.repo.code_taken(data["code"]):
            raise AlreadyExistsError(f"A service with code '{data['code']}' already exists.")
        return data

    async def _before_delete(self, entity: Service, auth: AuthContext) -> None:
        if await ClientServiceRepository(self.repo.session).exists(service_id=entity.id, status="active"):
            raise ConflictError("This service is part of an active engagement and cannot be removed.")


class EngagementService(BaseService[ClientService, ClientServiceRepository]):
    """Client engagements — one service sold to one client."""

    module = Module.CLIENT_SERVICES
    transitions = {
        "active": {"suspended", "completed", "cancelled"},
        "suspended": {"active", "cancelled"},
        "completed": set(),
        "cancelled": set(),
    }

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        session = self.repo.session

        if await ClientRepository(session).get(data["client_id"]) is None:
            raise NotFoundError("Client", data["client_id"])

        service = await ServiceRepository(session).get(data["service_id"])
        if service is None:
            raise NotFoundError("Service", data["service_id"])

        if await self.repo.active_engagement_exists(data["client_id"], data["service_id"]):
            raise AlreadyExistsError("This client already has an active engagement for that service.")

        data.setdefault("billing_cycle", service.billing_cycle)
        data.setdefault("price_agreed", service.base_price)
        data.setdefault("next_billing_date", next_billing_date(data["start_date"], data["billing_cycle"]))
        return data

    async def _before_update(
        self, entity: ClientService, data: dict[str, Any], auth: AuthContext
    ) -> dict[str, Any]:
        # A closed engagement stops generating invoices.
        if data.get("status") in ("completed", "cancelled"):
            data["next_billing_date"] = None
        return data


# --- Factories ---------------------------------------------------------------

def lead_service(s: AsyncSession) -> LeadService:
    return LeadService(LeadRepository(s))


def consultation_service(s: AsyncSession) -> ConsultationService:
    return ConsultationService(ConsultationRepository(s))


def proposal_service(s: AsyncSession) -> ProposalService:
    return ProposalService(ProposalRepository(s))


def client_service(s: AsyncSession) -> ClientService_:
    return ClientService_(ClientRepository(s))


def client_entity_service(s: AsyncSession) -> ClientEntityService:
    return ClientEntityService(ClientEntityRepository(s))


def client_kyc_service(s: AsyncSession) -> ClientKycService:
    return ClientKycService(ClientKycRepository(s))


def service_catalog_service(s: AsyncSession) -> ServiceCatalogService:
    return ServiceCatalogService(ServiceRepository(s))


def engagement_service(s: AsyncSession) -> EngagementService:
    return EngagementService(ClientServiceRepository(s))
