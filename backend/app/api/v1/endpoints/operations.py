"""Endpoints for tasks, compliance, audit, and statutory filings."""

from datetime import date, timedelta
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Query, Request, status

from app.api.crud_router import build_crud_router
from app.api.deps import CurrentUser, DbSession
from app.core.permissions import Module
from app.schemas.common import MessageResponse, SuccessResponse
from app.schemas.operations import (
    AuditChecklistCreate,
    AuditChecklistRead,
    AuditChecklistUpdate,
    AuditCreate,
    AuditObservationCreate,
    AuditObservationRead,
    AuditObservationUpdate,
    AuditRead,
    AuditResponseCreate,
    AuditResponseRead,
    AuditUpdate,
    ComplianceEntryCreate,
    ComplianceEntryRead,
    ComplianceEntryUpdate,
    ComplianceTypeCreate,
    ComplianceTypeRead,
    GstReconciliationResult,
    GstReturnCreate,
    GstReturnRead,
    GstReturnUpdate,
    TaskAssign,
    TaskAssignmentRead,
    TaskCreate,
    TaskRead,
    TaskUpdate,
    TaxReturnCreate,
    TaxReturnRead,
    TaxReturnUpdate,
)
from app.services.operations import (
    audit_checklist_service,
    audit_observation_service,
    audit_service,
    compliance_calendar_service,
    compliance_type_service,
    gst_return_service,
    task_service,
    tax_return_service,
)


def _rid(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


# --- Tasks -------------------------------------------------------------------


async def task_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    task_type: Annotated[str | None, Query()] = None,
    priority: Annotated[str | None, Query()] = None,
    branch_id: Annotated[UUID | None, Query()] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {
            "client_id": client_id, "status": status, "task_type": task_type,
            "priority": priority, "branch_id": branch_id,
        }.items()
        if v
    }


tasks_router: APIRouter = build_crud_router(
    service_factory=task_service,
    read_schema=TaskRead,
    create_schema=TaskCreate,
    update_schema=TaskUpdate,
    module=Module.TASKS,
    resource_name="task",
    filter_dependency=task_filters,
)


@tasks_router.get("/mine/open", response_model=SuccessResponse[list[TaskRead]], summary="Tasks assigned to me")
async def my_tasks(
    request: Request,
    session: DbSession,
    auth: CurrentUser,
    include_completed: Annotated[bool, Query()] = False,
) -> SuccessResponse[list[TaskRead]]:
    tasks = await task_service(session).my_tasks(auth, open_only=not include_completed)
    return SuccessResponse[list[TaskRead]](
        data=[TaskRead.model_validate(t) for t in tasks], request_id=_rid(request)
    )


@tasks_router.get("/board/summary", response_model=SuccessResponse[dict[str, int]], summary="Task counts by status")
async def board_summary(request: Request, session: DbSession, auth: CurrentUser) -> SuccessResponse[dict[str, int]]:
    return SuccessResponse[dict[str, int]](
        data=await task_service(session).board_summary(auth), request_id=_rid(request)
    )


@tasks_router.get("/board/workload", response_model=SuccessResponse[dict[str, int]], summary="Open tasks per employee")
async def workload(request: Request, session: DbSession, auth: CurrentUser) -> SuccessResponse[dict[str, int]]:
    return SuccessResponse[dict[str, int]](
        data=await task_service(session).workload(auth), request_id=_rid(request)
    )


@tasks_router.post(
    "/{task_id}/assignments",
    response_model=SuccessResponse[TaskAssignmentRead],
    status_code=status.HTTP_201_CREATED,
    summary="Assign an employee to a task",
)
async def assign_task(
    request: Request, task_id: UUID, payload: TaskAssign, session: DbSession, auth: CurrentUser
) -> SuccessResponse[TaskAssignmentRead]:
    record = await task_service(session).assign(task_id, payload.model_dump(), auth)
    return SuccessResponse[TaskAssignmentRead](
        data=TaskAssignmentRead.model_validate(record), request_id=_rid(request)
    )


# --- Compliance --------------------------------------------------------------

compliance_types_router: APIRouter = build_crud_router(
    service_factory=compliance_type_service,
    read_schema=ComplianceTypeRead,
    create_schema=ComplianceTypeCreate,
    update_schema=None,
    module=Module.COMPLIANCE,
    resource_name="compliance type",
)


async def calendar_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query(pattern="^(pending|filed|overdue|waived)$")] = None,
    tax_year: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}$")] = None,
) -> dict[str, Any]:
    return {
        k: v for k, v in {"client_id": client_id, "status": status, "tax_year": tax_year}.items() if v
    }


calendar_router: APIRouter = build_crud_router(
    service_factory=compliance_calendar_service,
    read_schema=ComplianceEntryRead,
    create_schema=ComplianceEntryCreate,
    update_schema=ComplianceEntryUpdate,
    module=Module.COMPLIANCE,
    resource_name="compliance entry",
    filter_dependency=calendar_filters,
)


@calendar_router.get(
    "/upcoming/due",
    response_model=SuccessResponse[list[ComplianceEntryRead]],
    summary="Obligations falling due in a window",
)
async def upcoming_due(
    request: Request,
    session: DbSession,
    auth: CurrentUser,
    days: Annotated[int, Query(ge=1, le=365, description="Days ahead to look")] = 30,
    client_id: Annotated[UUID | None, Query()] = None,
) -> SuccessResponse[list[ComplianceEntryRead]]:
    today = date.today()
    entries = await compliance_calendar_service(session).upcoming(
        auth, start=today, end=today + timedelta(days=days), client_id=client_id
    )
    return SuccessResponse[list[ComplianceEntryRead]](
        data=[ComplianceEntryRead.model_validate(e) for e in entries], request_id=_rid(request)
    )


@calendar_router.post(
    "/refresh-overdue",
    response_model=MessageResponse,
    summary="Flag pending obligations whose due date has passed",
)
async def refresh_overdue(request: Request, session: DbSession, auth: CurrentUser) -> MessageResponse:
    count = await compliance_calendar_service(session).refresh_overdue(auth)
    return MessageResponse(message=f"{count} obligation(s) marked overdue.", request_id=_rid(request))


# --- Audit -------------------------------------------------------------------


async def audit_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    audit_type: Annotated[str | None, Query()] = None,
    risk_rating: Annotated[str | None, Query(pattern="^(low|medium|high)$")] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {
            "client_id": client_id, "status": status,
            "audit_type": audit_type, "risk_rating": risk_rating,
        }.items()
        if v
    }


audits_router: APIRouter = build_crud_router(
    service_factory=audit_service,
    read_schema=AuditRead,
    create_schema=AuditCreate,
    update_schema=AuditUpdate,
    module=Module.AUDITS,
    resource_name="audit",
    filter_dependency=audit_filters,
)


@audits_router.get(
    "/{audit_id}/progress",
    response_model=SuccessResponse[dict[str, Any]],
    summary="Checklist completion and open findings",
)
async def audit_progress(
    request: Request, audit_id: UUID, session: DbSession, auth: CurrentUser
) -> SuccessResponse[dict[str, Any]]:
    return SuccessResponse[dict[str, Any]](
        data=await audit_service(session).progress(audit_id, auth), request_id=_rid(request)
    )


async def checklist_filters(
    audit_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"audit_id": audit_id, "status": status}.items() if v}


checklists_router: APIRouter = build_crud_router(
    service_factory=audit_checklist_service,
    read_schema=AuditChecklistRead,
    create_schema=AuditChecklistCreate,
    update_schema=AuditChecklistUpdate,
    module=Module.AUDITS,
    resource_name="checklist item",
    filter_dependency=checklist_filters,
)


async def observation_filters(
    audit_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    risk_level: Annotated[str | None, Query(pattern="^(low|medium|high)$")] = None,
) -> dict[str, Any]:
    return {
        k: v for k, v in {"audit_id": audit_id, "status": status, "risk_level": risk_level}.items() if v
    }


observations_router: APIRouter = build_crud_router(
    service_factory=audit_observation_service,
    read_schema=AuditObservationRead,
    create_schema=AuditObservationCreate,
    update_schema=AuditObservationUpdate,
    module=Module.AUDITS,
    resource_name="observation",
    filter_dependency=observation_filters,
)


@observations_router.post(
    "/{observation_id}/responses",
    response_model=SuccessResponse[AuditResponseRead],
    status_code=status.HTTP_201_CREATED,
    summary="Record a management response",
)
async def respond_to_observation(
    request: Request,
    observation_id: UUID,
    payload: AuditResponseCreate,
    session: DbSession,
    auth: CurrentUser,
) -> SuccessResponse[AuditResponseRead]:
    response = await audit_observation_service(session).respond(
        observation_id, payload.response_text, auth
    )
    return SuccessResponse[AuditResponseRead](
        data=AuditResponseRead.model_validate(response), request_id=_rid(request)
    )


# --- Income tax --------------------------------------------------------------


async def tax_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    entity_id: Annotated[UUID | None, Query()] = None,
    financial_year: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}$")] = None,
    status: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {
            "client_id": client_id, "entity_id": entity_id,
            "financial_year": financial_year, "status": status,
        }.items()
        if v
    }


tax_router: APIRouter = build_crud_router(
    service_factory=tax_return_service,
    read_schema=TaxReturnRead,
    create_schema=TaxReturnCreate,
    update_schema=TaxReturnUpdate,
    module=Module.TAX,
    resource_name="tax return",
    filter_dependency=tax_filters,
)


# --- GST ---------------------------------------------------------------------


async def gst_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    entity_id: Annotated[UUID | None, Query()] = None,
    period_year: Annotated[int | None, Query(ge=2017, le=2100)] = None,
    period_month: Annotated[int | None, Query(ge=1, le=12)] = None,
    return_type: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {
            "client_id": client_id, "entity_id": entity_id, "period_year": period_year,
            "period_month": period_month, "return_type": return_type, "status": status,
        }.items()
        if v is not None
    }


gst_router: APIRouter = build_crud_router(
    service_factory=gst_return_service,
    read_schema=GstReturnRead,
    create_schema=GstReturnCreate,
    update_schema=GstReturnUpdate,
    module=Module.GST,
    resource_name="GST return",
    filter_dependency=gst_filters,
)


@gst_router.get(
    "/{gst_return_id}/reconciliation",
    response_model=SuccessResponse[GstReconciliationResult],
    summary="Net liability and late fee for a return",
    description="Recomputes output tax less input credit, and any late fee "
    "against the statutory due date. Values are never trusted from the caller.",
)
async def gst_reconciliation(
    request: Request, gst_return_id: UUID, session: DbSession, auth: CurrentUser
) -> SuccessResponse[GstReconciliationResult]:
    result = await gst_return_service(session).reconcile(gst_return_id, auth)
    return SuccessResponse[GstReconciliationResult](
        data=GstReconciliationResult.model_validate(result), request_id=_rid(request)
    )
