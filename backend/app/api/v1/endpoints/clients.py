"""Client master data, legal entities, KYC, and engagements."""

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Query, Request, status

from app.api.crud_router import build_crud_router
from app.api.deps import CurrentUser, DbSession
from app.core.permissions import Module
from app.schemas.clients import (
    ClientCreate,
    ClientEntityCreate,
    ClientEntityRead,
    ClientEntityUpdate,
    ClientKycCreate,
    ClientKycRead,
    ClientKycVerify,
    ClientRead,
    ClientServiceCreate,
    ClientServiceRead,
    ClientServiceUpdate,
    ClientUpdate,
    ServiceCreate,
    ServiceRead,
    ServiceUpdate,
)
from app.schemas.common import SuccessResponse
from app.services.clients import (
    client_entity_service,
    client_kyc_service,
    client_service,
    engagement_service,
    service_catalog_service,
)


async def client_filters(
    status: Annotated[str | None, Query(pattern="^(active|inactive|suspended)$")] = None,
    branch_id: Annotated[UUID | None, Query()] = None,
    client_type: Annotated[str | None, Query()] = None,
    relationship_manager_id: Annotated[UUID | None, Query()] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {
            "status": status,
            "branch_id": branch_id,
            "client_type": client_type,
            "relationship_manager_id": relationship_manager_id,
        }.items()
        if v
    }


router: APIRouter = build_crud_router(
    service_factory=client_service,
    read_schema=ClientRead,
    create_schema=ClientCreate,
    update_schema=ClientUpdate,
    module=Module.CLIENTS,
    resource_name="client",
    filter_dependency=client_filters,
)


@router.post(
    "/convert-lead/{lead_id}",
    response_model=SuccessResponse[ClientRead],
    status_code=status.HTTP_201_CREATED,
    summary="Convert a lead into a client",
    description="Creates the client, then marks the lead won. The lead is only "
    "updated after the client exists, so a failure cannot orphan the pipeline.",
)
async def convert_lead(
    request: Request, lead_id: UUID, payload: ClientCreate, session: DbSession, auth: CurrentUser
) -> SuccessResponse[ClientRead]:
    client = await client_service(session).convert_lead(
        lead_id, payload.model_dump(exclude_unset=True), auth
    )
    return SuccessResponse[ClientRead](
        data=ClientRead.model_validate(client), request_id=getattr(request.state, "request_id", None)
    )


# --- Legal entities ----------------------------------------------------------


async def entity_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    entity_type: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"client_id": client_id, "entity_type": entity_type}.items() if v}


entities_router: APIRouter = build_crud_router(
    service_factory=client_entity_service,
    read_schema=ClientEntityRead,
    create_schema=ClientEntityCreate,
    update_schema=ClientEntityUpdate,
    module=Module.CLIENTS,
    resource_name="client entity",
    filter_dependency=entity_filters,
)


# --- KYC ---------------------------------------------------------------------


async def kyc_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query(pattern="^(pending|verified|rejected)$")] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"client_id": client_id, "status": status}.items() if v}


kyc_router: APIRouter = build_crud_router(
    service_factory=client_kyc_service,
    read_schema=ClientKycRead,
    create_schema=ClientKycCreate,
    update_schema=None,
    module=Module.CLIENTS,
    resource_name="KYC document",
    filter_dependency=kyc_filters,
    enable_delete=False,
)


@kyc_router.post(
    "/{kyc_id}/verify",
    response_model=SuccessResponse[ClientKycRead],
    summary="Verify or reject a KYC document",
    description="Staff only. A client can never verify their own identity documents.",
)
async def verify_kyc(
    request: Request, kyc_id: UUID, payload: ClientKycVerify, session: DbSession, auth: CurrentUser
) -> SuccessResponse[ClientKycRead]:
    document = await client_kyc_service(session).verify(kyc_id, payload.model_dump(), auth)
    return SuccessResponse[ClientKycRead](
        data=ClientKycRead.model_validate(document), request_id=getattr(request.state, "request_id", None)
    )


# --- Service catalogue -------------------------------------------------------


async def service_filters(
    department: Annotated[str | None, Query()] = None,
    billing_cycle: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"department": department, "billing_cycle": billing_cycle}.items() if v}


services_router: APIRouter = build_crud_router(
    service_factory=service_catalog_service,
    read_schema=ServiceRead,
    create_schema=ServiceCreate,
    update_schema=ServiceUpdate,
    module=Module.SERVICES,
    resource_name="service",
    filter_dependency=service_filters,
)


# --- Engagements -------------------------------------------------------------


async def engagement_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    service_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query(pattern="^(active|suspended|completed|cancelled)$")] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {"client_id": client_id, "service_id": service_id, "status": status}.items()
        if v
    }


engagements_router: APIRouter = build_crud_router(
    service_factory=engagement_service,
    read_schema=ClientServiceRead,
    create_schema=ClientServiceCreate,
    update_schema=ClientServiceUpdate,
    module=Module.CLIENT_SERVICES,
    resource_name="engagement",
    filter_dependency=engagement_filters,
)
