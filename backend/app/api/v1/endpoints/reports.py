"""Report generation and dashboard analytics."""

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Query, Request, status

from app.api.crud_router import build_crud_router
from app.api.deps import CurrentUser, DbSession
from app.core.permissions import Module
from app.schemas.common import SuccessResponse
from app.schemas.content import ReportRead, ReportRequest, ReportShare
from app.schemas.operations import SignedUrlResponse
from app.services.reports import REPORT_URL_TTL_SECONDS, analytics_service, report_service


def _rid(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


async def report_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    report_type: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query(pattern="^(queued|generating|ready|failed|expired)$")] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {"client_id": client_id, "report_type": report_type, "status": status}.items()
        if v
    }


router: APIRouter = build_crud_router(
    service_factory=report_service,
    read_schema=ReportRead,
    create_schema=None,  # requested through the endpoint below
    update_schema=None,
    module=Module.REPORTS,
    resource_name="report",
    filter_dependency=report_filters,
    enable_delete=False,
)


@router.post(
    "",
    response_model=SuccessResponse[ReportRead],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Request a report",
    description="Queues generation and returns immediately. Poll the report, or "
    "wait for the notification, then download it with a signed link.",
)
async def request_report(
    request: Request, payload: ReportRequest, session: DbSession, auth: CurrentUser
) -> SuccessResponse[ReportRead]:
    report = await report_service(session).request(payload.model_dump(), auth)
    return SuccessResponse[ReportRead](
        data=ReportRead.model_validate(report), request_id=_rid(request)
    )


@router.get(
    "/{report_id}/download",
    response_model=SuccessResponse[SignedUrlResponse],
    summary="Signed download link for a generated report",
)
async def download_report(
    request: Request, report_id: UUID, session: DbSession, auth: CurrentUser
) -> SuccessResponse[SignedUrlResponse]:
    url, filename = await report_service(session).download_url(report_id, auth)
    return SuccessResponse[SignedUrlResponse](
        data=SignedUrlResponse(url=url, expires_in=REPORT_URL_TTL_SECONDS, filename=filename),
        request_id=_rid(request),
    )


@router.post(
    "/{report_id}/share",
    response_model=SuccessResponse[ReportRead],
    summary="Release a report to the client portal, or withdraw it",
)
async def share_report(
    request: Request, report_id: UUID, payload: ReportShare, session: DbSession, auth: CurrentUser
) -> SuccessResponse[ReportRead]:
    report = await report_service(session).share(report_id, payload.is_shared_with_client, auth)
    return SuccessResponse[ReportRead](
        data=ReportRead.model_validate(report), request_id=_rid(request)
    )


# --- Analytics ---------------------------------------------------------------

analytics_router = APIRouter()


@analytics_router.get(
    "/dashboard/client",
    response_model=SuccessResponse[dict[str, Any]],
    summary="Client portal KPI tiles",
)
async def client_dashboard(
    request: Request, session: DbSession, auth: CurrentUser
) -> SuccessResponse[dict[str, Any]]:
    return SuccessResponse[dict[str, Any]](
        data=await analytics_service(session).client_dashboard(auth), request_id=_rid(request)
    )


@analytics_router.get(
    "/dashboard/firm",
    response_model=SuccessResponse[dict[str, Any]],
    summary="Firm-wide KPI tiles",
    description="Scoped to the caller's branch unless they are an administrator.",
)
async def firm_dashboard(
    request: Request, session: DbSession, auth: CurrentUser
) -> SuccessResponse[dict[str, Any]]:
    return SuccessResponse[dict[str, Any]](
        data=await analytics_service(session).firm_dashboard(auth), request_id=_rid(request)
    )


@analytics_router.get(
    "/books/{client_id}/health",
    response_model=SuccessResponse[dict[str, Any]],
    summary="Whether a client's books balance",
)
async def books_health(
    request: Request, client_id: UUID, session: DbSession, auth: CurrentUser
) -> SuccessResponse[dict[str, Any]]:
    return SuccessResponse[dict[str, Any]](
        data=await analytics_service(session).trial_balance_health(client_id, auth),
        request_id=_rid(request),
    )
