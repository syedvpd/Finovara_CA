"""Branch endpoints."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Query

from app.api.crud_router import build_crud_router
from app.core.permissions import Module
from app.schemas.identity import BranchCreate, BranchRead, BranchUpdate
from app.services.identity import branch_service


async def branch_filters(
    code: Annotated[str | None, Query(description="Exact branch code, e.g. HYD")] = None,
) -> dict[str, Any]:
    return {"code": code.upper()} if code else {}


router: APIRouter = build_crud_router(
    service_factory=branch_service,
    read_schema=BranchRead,
    create_schema=BranchCreate,
    update_schema=BranchUpdate,
    module=Module.BRANCHES,
    resource_name="branch",
    filter_dependency=branch_filters,
)
