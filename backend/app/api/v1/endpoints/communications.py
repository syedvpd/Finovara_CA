"""Notifications, queries, and the client message thread."""

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Query, Request, status

from app.api.crud_router import build_crud_router
from app.api.deps import CurrentUser, DbSession
from app.core.permissions import Module
from app.schemas.common import BulkActionResult, MessageResponse, SuccessResponse
from app.schemas.content import (
    BroadcastRequest,
    ChatMessageCreate,
    ChatMessageRead,
    NotificationCreate,
    NotificationRead,
    NotificationTemplateCreate,
    NotificationTemplateRead,
    NotificationTemplateUpdate,
    QueryCreate,
    QueryRead,
    QueryReply,
    QueryResponseRead,
    QueryUpdate,
)
from app.services.communications import (
    chat_service,
    notification_service,
    notification_template_service,
    query_service,
)


def _rid(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


# --- Notifications -----------------------------------------------------------


async def notification_filters(
    status: Annotated[str | None, Query(pattern="^(pending|sent|failed|read)$")] = None,
    channel: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"status": status, "channel": channel}.items() if v}


router: APIRouter = build_crud_router(
    service_factory=notification_service,
    read_schema=NotificationRead,
    create_schema=NotificationCreate,
    update_schema=None,
    module=Module.NOTIFICATIONS,
    resource_name="notification",
    filter_dependency=notification_filters,
    enable_delete=False,
)


@router.get("/unread/count", response_model=SuccessResponse[int], summary="Unread notification count")
async def unread_count(request: Request, session: DbSession, auth: CurrentUser) -> SuccessResponse[int]:
    return SuccessResponse[int](
        data=await notification_service(session).unread_count(auth), request_id=_rid(request)
    )


@router.post("/{notification_id}/read", response_model=MessageResponse, summary="Mark one as read")
async def mark_read(
    request: Request, notification_id: UUID, session: DbSession, auth: CurrentUser
) -> MessageResponse:
    await notification_service(session).mark_read(notification_id, auth)
    return MessageResponse(message="Notification marked read.", request_id=_rid(request))


@router.post("/read-all", response_model=MessageResponse, summary="Mark every notification read")
async def mark_all_read(request: Request, session: DbSession, auth: CurrentUser) -> MessageResponse:
    count = await notification_service(session).mark_all_read(auth)
    return MessageResponse(message=f"{count} notification(s) marked read.", request_id=_rid(request))


@router.post(
    "/broadcast",
    response_model=SuccessResponse[BulkActionResult],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue a templated notification to many recipients",
)
async def broadcast(
    request: Request, payload: BroadcastRequest, session: DbSession, auth: CurrentUser
) -> SuccessResponse[BulkActionResult]:
    result = await notification_service(session).broadcast(payload.model_dump(), auth)
    return SuccessResponse[BulkActionResult](
        data=BulkActionResult.model_validate(result), request_id=_rid(request)
    )


templates_router: APIRouter = build_crud_router(
    service_factory=notification_template_service,
    read_schema=NotificationTemplateRead,
    create_schema=NotificationTemplateCreate,
    update_schema=NotificationTemplateUpdate,
    module=Module.NOTIFICATIONS,
    resource_name="notification template",
)


# --- Queries -----------------------------------------------------------------


async def query_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query(pattern="^(open|answered|resolved|closed)$")] = None,
    assigned_to: Annotated[UUID | None, Query()] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {"client_id": client_id, "status": status, "assigned_to": assigned_to}.items()
        if v
    }


queries_router: APIRouter = build_crud_router(
    service_factory=query_service,
    read_schema=QueryRead,
    create_schema=QueryCreate,
    update_schema=QueryUpdate,
    module=Module.QUERIES,
    resource_name="query",
    filter_dependency=query_filters,
    enable_delete=False,
)


@queries_router.post(
    "/{query_id}/replies",
    response_model=SuccessResponse[QueryResponseRead],
    status_code=status.HTTP_201_CREATED,
    summary="Reply to a query",
    description="A staff reply marks the query answered; a client reply reopens it.",
)
async def reply_to_query(
    request: Request, query_id: UUID, payload: QueryReply, session: DbSession, auth: CurrentUser
) -> SuccessResponse[QueryResponseRead]:
    response = await query_service(session).reply(query_id, payload.response_text, auth)
    return SuccessResponse[QueryResponseRead](
        data=QueryResponseRead.model_validate(response), request_id=_rid(request)
    )


# --- Chat --------------------------------------------------------------------


async def chat_filters(client_id: Annotated[UUID | None, Query()] = None) -> dict[str, Any]:
    return {"client_id": client_id} if client_id else {}


chat_router: APIRouter = build_crud_router(
    service_factory=chat_service,
    read_schema=ChatMessageRead,
    create_schema=ChatMessageCreate,
    update_schema=None,
    module=Module.CHAT,
    resource_name="message",
    filter_dependency=chat_filters,
    enable_delete=False,
)


@chat_router.post(
    "/{client_id}/read",
    response_model=MessageResponse,
    summary="Mark the counterparty's messages as read",
)
async def mark_thread_read(
    request: Request, client_id: UUID, session: DbSession, auth: CurrentUser
) -> MessageResponse:
    count = await chat_service(session).mark_thread_read(client_id, auth)
    return MessageResponse(message=f"{count} message(s) marked read.", request_id=_rid(request))
