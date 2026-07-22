"""Employee endpoints, including cross-branch access management."""

from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Query, Request

from app.api.crud_router import build_crud_router
from app.api.deps import CurrentUser, DbSession
from app.core.permissions import Module
from app.schemas.common import MessageResponse, SuccessResponse
from app.schemas.identity import (
    EmployeeBranchAccessGrant,
    EmployeeCreate,
    EmployeeRead,
    EmployeeUpdate,
)
from app.services.identity import employee_service


async def employee_filters(
    branch_id: Annotated[UUID | None, Query()] = None,
    department: Annotated[str | None, Query(max_length=100)] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"branch_id": branch_id, "department": department}.items() if v}


router: APIRouter = build_crud_router(
    service_factory=employee_service,
    read_schema=EmployeeRead,
    create_schema=EmployeeCreate,
    update_schema=EmployeeUpdate,
    module=Module.EMPLOYEES,
    resource_name="employee",
    filter_dependency=employee_filters,
)


@router.get(
    "/{employee_id}/branch-access",
    response_model=SuccessResponse[list[UUID]],
    summary="Branches this employee may operate in",
)
async def list_branch_access(
    request: Request, employee_id: UUID, session: DbSession, auth: CurrentUser
) -> SuccessResponse[list[UUID]]:
    service = employee_service(session)
    await service.get(employee_id, auth)
    branches = await service.repo.accessible_branch_ids(employee_id)
    return SuccessResponse[list[UUID]](
        data=branches, request_id=getattr(request.state, "request_id", None)
    )


@router.post(
    "/{employee_id}/branch-access",
    response_model=SuccessResponse[list[UUID]],
    summary="Grant cross-branch access",
)
async def grant_branch_access(
    request: Request,
    employee_id: UUID,
    payload: EmployeeBranchAccessGrant,
    session: DbSession,
    auth: CurrentUser,
) -> SuccessResponse[list[UUID]]:
    branches = await employee_service(session).grant_branch_access(
        employee_id, payload.branch_ids, auth
    )
    return SuccessResponse[list[UUID]](
        data=branches, request_id=getattr(request.state, "request_id", None)
    )


@router.delete(
    "/{employee_id}/branch-access/{branch_id}",
    response_model=MessageResponse,
    summary="Revoke cross-branch access",
)
async def revoke_branch_access(
    request: Request, employee_id: UUID, branch_id: UUID, session: DbSession, auth: CurrentUser
) -> MessageResponse:
    await employee_service(session).revoke_branch_access(employee_id, branch_id, auth)
    return MessageResponse(
        message="Branch access revoked.", request_id=getattr(request.state, "request_id", None)
    )
