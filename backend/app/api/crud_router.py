"""CRUD router factory.

Builds the five standard endpoints (list, retrieve, create, update, delete)
for a module from its service and schemas, so each module file only has to
describe what is genuinely specific to it.
"""

# NOTE: `from __future__ import annotations` must NOT be added to this module.
# The endpoint signatures below annotate parameters with runtime *values*
# (`payload: create_schema`). Postponed evaluation would turn those into the
# literal strings "create_schema"/"update_schema", which FastAPI cannot resolve
# into a body model — it silently demotes them to query parameters and every
# create/update call fails with "field required".

from collections.abc import Awaitable, Callable
from typing import Any, TypeVar
from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DbSession, CurrentUser, Pagination, Searching, Sorting
from app.core.permissions import Action, Module, perm
from app.core.security import AuthContext
from app.schemas.common import MessageResponse, PageMeta, PaginatedResponse, SuccessResponse

ReadT = TypeVar("ReadT", bound=BaseModel)
CreateT = TypeVar("CreateT", bound=BaseModel)
UpdateT = TypeVar("UpdateT", bound=BaseModel)

ServiceFactory = Callable[[AsyncSession], Any]
FilterDep = Callable[..., Awaitable[dict[str, Any]] | dict[str, Any]]


def _rid(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def build_crud_router(
    *,
    service_factory: ServiceFactory,
    read_schema: type[ReadT],
    create_schema: type[CreateT] | None = None,
    update_schema: type[UpdateT] | None = None,
    module: Module,
    resource_name: str,
    filter_dependency: FilterDep | None = None,
    enable_delete: bool = True,
    router: APIRouter | None = None,
) -> APIRouter:
    """Assemble the standard endpoints for one resource.

    ``filter_dependency`` supplies module-specific query filters (status, date
    ranges, foreign keys) as a plain dict.
    """
    router = router or APIRouter()
    title = resource_name.replace("_", " ")

    async def _filters(request: Request) -> dict[str, Any]:
        return {}

    filters_dep = filter_dependency or _filters

    @router.get(
        "",
        response_model=PaginatedResponse[read_schema],  # type: ignore[valid-type]
        summary=f"List {title}",
        description=f"Paginated, filterable, sortable list of {title} within the caller's scope.",
    )
    async def list_items(  # type: ignore[no-untyped-def]
        request: Request,
        session: DbSession,
        auth: CurrentUser,
        pagination: Pagination,
        sort: Sorting,
        search: Searching,
        filters: dict[str, Any] = Depends(filters_dep),
    ):
        service = service_factory(session)
        rows, total = await service.list(
            auth, pagination=pagination, sort=sort, search=search.q, filters=filters
        )
        return PaginatedResponse[read_schema](  # type: ignore[valid-type]
            data=[read_schema.model_validate(r) for r in rows],
            meta=PageMeta.build(page=pagination.page, page_size=pagination.page_size, total_items=total),
            request_id=_rid(request),
        )

    @router.get(
        "/{item_id}",
        response_model=SuccessResponse[read_schema],  # type: ignore[valid-type]
        summary=f"Retrieve {title}",
        responses={404: {"description": "Not found, or outside the caller's scope."}},
    )
    async def get_item(request: Request, item_id: UUID, session: DbSession, auth: CurrentUser):  # type: ignore[no-untyped-def]
        entity = await service_factory(session).get(item_id, auth)
        return SuccessResponse[read_schema](  # type: ignore[valid-type]
            data=read_schema.model_validate(entity), request_id=_rid(request)
        )

    if create_schema is not None:
        @router.post(
            "",
            response_model=SuccessResponse[read_schema],  # type: ignore[valid-type]
            status_code=status.HTTP_201_CREATED,
            summary=f"Create {title}",
            openapi_extra={"x-required-permission": perm(module, Action.CREATE)},
        )
        async def create_item(request: Request, payload: create_schema, session: DbSession, auth: CurrentUser):  # type: ignore[no-untyped-def,valid-type]
            entity = await service_factory(session).create(payload.model_dump(exclude_unset=True), auth)
            return SuccessResponse[read_schema](  # type: ignore[valid-type]
                data=read_schema.model_validate(entity), request_id=_rid(request)
            )

    if update_schema is not None:
        @router.patch(
            "/{item_id}",
            response_model=SuccessResponse[read_schema],  # type: ignore[valid-type]
            summary=f"Update {title}",
            openapi_extra={"x-required-permission": perm(module, Action.UPDATE)},
        )
        async def update_item(  # type: ignore[no-untyped-def]
            request: Request, item_id: UUID, payload: update_schema, session: DbSession, auth: CurrentUser  # type: ignore[valid-type]
        ):
            entity = await service_factory(session).update(
                item_id, payload.model_dump(exclude_unset=True), auth
            )
            return SuccessResponse[read_schema](  # type: ignore[valid-type]
                data=read_schema.model_validate(entity), request_id=_rid(request)
            )

    if enable_delete:
        @router.delete(
            "/{item_id}",
            response_model=MessageResponse,
            summary=f"Delete {title}",
            description="Soft delete where the model supports it; the row remains for audit.",
            openapi_extra={"x-required-permission": perm(module, Action.DELETE)},
        )
        async def delete_item(request: Request, item_id: UUID, session: DbSession, auth: CurrentUser):  # type: ignore[no-untyped-def]
            await service_factory(session).delete(item_id, auth)
            return MessageResponse(message=f"{title.capitalize()} deleted.", request_id=_rid(request))

    return router
