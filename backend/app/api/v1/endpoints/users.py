"""User administration endpoints."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Query

from app.api.crud_router import build_crud_router
from app.core.permissions import Module
from app.schemas.identity import UserAdminUpdate, UserRead
from app.services.identity import user_service


async def user_filters(
    status: Annotated[str | None, Query(pattern="^(active|inactive)$")] = None,
    role_id: Annotated[str | None, Query(description="Filter by role id")] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"status": status, "role_id": role_id}.items() if v}


# Users are provisioned through Supabase Auth, so there is no create endpoint:
# a POST here would create a profile row with no corresponding auth identity.
router: APIRouter = build_crud_router(
    service_factory=user_service,
    read_schema=UserRead,
    create_schema=None,
    update_schema=UserAdminUpdate,
    module=Module.USERS,
    resource_name="user",
    filter_dependency=user_filters,
)
