"""CRM endpoints: leads, consultations, and proposals."""

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Query, Request

from app.api.crud_router import build_crud_router
from app.api.deps import CurrentUser, DbSession
from app.core.permissions import Module
from app.schemas.clients import (
    ConsultationCreate,
    ConsultationRead,
    ConsultationUpdate,
    LeadCreate,
    LeadRead,
    LeadUpdate,
    ProposalCreate,
    ProposalRead,
    ProposalUpdate,
)
from app.schemas.common import SuccessResponse
from app.services.clients import consultation_service, lead_service, proposal_service


async def lead_filters(
    status: Annotated[str | None, Query()] = None,
    source: Annotated[str | None, Query()] = None,
    assigned_rm_id: Annotated[UUID | None, Query()] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"status": status, "source": source, "assigned_rm_id": assigned_rm_id}.items() if v}


leads_router: APIRouter = build_crud_router(
    service_factory=lead_service,
    read_schema=LeadRead,
    create_schema=LeadCreate,
    update_schema=LeadUpdate,
    module=Module.LEADS,
    resource_name="lead",
    filter_dependency=lead_filters,
)


@leads_router.get(
    "/pipeline/summary",
    response_model=SuccessResponse[dict[str, int]],
    summary="Lead count by pipeline stage",
)
async def pipeline_summary(
    request: Request, session: DbSession, auth: CurrentUser
) -> SuccessResponse[dict[str, int]]:
    counts = await lead_service(session).pipeline_summary(auth)
    return SuccessResponse[dict[str, int]](
        data=counts, request_id=getattr(request.state, "request_id", None)
    )


async def consultation_filters(
    lead_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"lead_id": lead_id, "status": status}.items() if v}


consultations_router: APIRouter = build_crud_router(
    service_factory=consultation_service,
    read_schema=ConsultationRead,
    create_schema=ConsultationCreate,
    update_schema=ConsultationUpdate,
    module=Module.CONSULTATIONS,
    resource_name="consultation",
    filter_dependency=consultation_filters,
)


async def proposal_filters(
    lead_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"lead_id": lead_id, "status": status}.items() if v}


proposals_router: APIRouter = build_crud_router(
    service_factory=proposal_service,
    read_schema=ProposalRead,
    create_schema=ProposalCreate,
    update_schema=ProposalUpdate,
    module=Module.PROPOSALS,
    resource_name="proposal",
    filter_dependency=proposal_filters,
)
