"""Payroll endpoints.

Calculation and payslip data only. No endpoint here initiates a bank transfer
and the service holds no banking credentials.
"""

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Query, Request, status

from app.api.crud_router import build_crud_router
from app.api.deps import CurrentUser, DbSession
from app.core.permissions import Module
from app.schemas.common import BulkActionResult, MessageResponse, SuccessResponse
from app.schemas.finance import (
    AttendanceBulkUpsert,
    AttendanceRead,
    AttendanceUpsert,
    PayrollCalculationResult,
    PayrollProfileCreate,
    PayrollProfileRead,
    PayrollProfileUpdate,
    PayrollRecordRead,
    PayrollRunCreate,
    PayrollRunRead,
    PayrollRunUpdate,
    StatutoryConfigCreate,
    StatutoryConfigRead,
    StatutoryConfigUpdate,
)
from app.services.payroll import (
    attendance_service,
    payroll_profile_service,
    payroll_service,
    statutory_config_service,
)


def _rid(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


# --- Runs --------------------------------------------------------------------


async def run_filters(
    branch_id: Annotated[UUID | None, Query()] = None,
    period_year: Annotated[int | None, Query(ge=2000, le=2100)] = None,
    period_month: Annotated[int | None, Query(ge=1, le=12)] = None,
    status: Annotated[str | None, Query(pattern="^(draft|calculated|verified|paid)$")] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {
            "branch_id": branch_id, "period_year": period_year,
            "period_month": period_month, "status": status,
        }.items()
        if v is not None
    }


router: APIRouter = build_crud_router(
    service_factory=payroll_service,
    read_schema=PayrollRunRead,
    create_schema=PayrollRunCreate,
    update_schema=PayrollRunUpdate,
    module=Module.PAYROLL,
    resource_name="payroll run",
    filter_dependency=run_filters,
)


@router.post(
    "/{run_id}/calculate",
    response_model=SuccessResponse[PayrollCalculationResult],
    summary="Compute every payslip in a run",
    description="Applies the statutory rates in force for the period from "
    "`payroll_statutory_config`. Idempotent — re-running replaces the previous "
    "figures, so a correction to attendance or a rate can simply be recalculated.",
)
async def calculate_payroll(
    request: Request,
    run_id: UUID,
    session: DbSession,
    auth: CurrentUser,
    client_id: Annotated[UUID | None, Query(description="Restrict to one client's employees")] = None,
) -> SuccessResponse[PayrollCalculationResult]:
    result = await payroll_service(session).calculate(run_id, auth, client_id=client_id)
    return SuccessResponse[PayrollCalculationResult](
        data=PayrollCalculationResult.model_validate(result), request_id=_rid(request)
    )


@router.get(
    "/{run_id}/records",
    response_model=SuccessResponse[list[PayrollRecordRead]],
    summary="Computed payslips for a run",
)
async def run_records(
    request: Request, run_id: UUID, session: DbSession, auth: CurrentUser
) -> SuccessResponse[list[PayrollRecordRead]]:
    service = payroll_service(session)
    await service.get(run_id, auth)
    records = await service.repo.records_for(run_id)
    return SuccessResponse[list[PayrollRecordRead]](
        data=[PayrollRecordRead.model_validate(r) for r in records], request_id=_rid(request)
    )


# --- Employee profiles -------------------------------------------------------


async def profile_filters(client_id: Annotated[UUID | None, Query()] = None) -> dict[str, Any]:
    return {"client_id": client_id} if client_id else {}


profiles_router: APIRouter = build_crud_router(
    service_factory=payroll_profile_service,
    read_schema=PayrollProfileRead,
    create_schema=PayrollProfileCreate,
    update_schema=PayrollProfileUpdate,
    module=Module.PAYROLL,
    resource_name="payroll profile",
    filter_dependency=profile_filters,
)


# --- Attendance --------------------------------------------------------------


async def attendance_filters(
    employee_profile_id: Annotated[UUID | None, Query()] = None,
    period_year: Annotated[int | None, Query(ge=2000, le=2100)] = None,
    period_month: Annotated[int | None, Query(ge=1, le=12)] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {
            "employee_profile_id": employee_profile_id,
            "period_year": period_year,
            "period_month": period_month,
        }.items()
        if v is not None
    }


attendance_router: APIRouter = build_crud_router(
    service_factory=attendance_service,
    read_schema=AttendanceRead,
    create_schema=AttendanceUpsert,
    update_schema=None,
    module=Module.PAYROLL,
    resource_name="attendance record",
    filter_dependency=attendance_filters,
)


@attendance_router.post(
    "/bulk",
    response_model=SuccessResponse[BulkActionResult],
    status_code=status.HTTP_200_OK,
    summary="Import a month of attendance",
    description="Upserts by (employee, period), so re-importing a corrected "
    "sheet updates the existing rows rather than duplicating them.",
)
async def bulk_attendance(
    request: Request, payload: AttendanceBulkUpsert, session: DbSession, auth: CurrentUser
) -> SuccessResponse[BulkActionResult]:
    result = await attendance_service(session).bulk_upsert(
        [record.model_dump() for record in payload.records], auth
    )
    return SuccessResponse[BulkActionResult](
        data=BulkActionResult.model_validate(result), request_id=_rid(request)
    )


# --- Statutory configuration -------------------------------------------------


async def statutory_filters(
    component: Annotated[str | None, Query()] = None,
    financial_year: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}$")] = None,
    state_code: Annotated[str | None, Query(max_length=10)] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {
            "component": component, "financial_year": financial_year, "state_code": state_code,
        }.items()
        if v
    }


statutory_router: APIRouter = build_crud_router(
    service_factory=statutory_config_service,
    read_schema=StatutoryConfigRead,
    create_schema=StatutoryConfigCreate,
    update_schema=StatutoryConfigUpdate,
    module=Module.SETTINGS,
    resource_name="statutory rate",
    filter_dependency=statutory_filters,
)
