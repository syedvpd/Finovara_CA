"""Reference data endpoints: financial years, categories, document taxonomy.

These drive dropdowns across the frontend, so most are readable by any
authenticated user and the public ones back the marketing site.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Query, Request
from sqlalchemy import select

from app.api.crud_router import build_crud_router
from app.api.deps import AdminUser, CurrentUser, DbSession, OptionalUser
from app.core.exceptions import ConflictError, NotFoundError
from app.core.permissions import Module
from app.models.reference import Category, DocumentCategory, FinancialYear
from app.repositories.base import BaseRepository
from app.schemas.common import APIModel, MessageResponse, SuccessResponse
from app.services.base import BaseService

router = APIRouter()


def _rid(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


# --- Schemas ------------------------------------------------------------------


class FinancialYearRead(APIModel):
    id: UUID
    code: str
    label: str
    assessment_year: str
    start_date: Any
    end_date: Any
    is_current: bool
    is_locked: bool
    locked_at: datetime | None = None


class CategoryRead(APIModel):
    id: UUID
    name: str
    slug: str
    description: str | None = None
    kind: str
    parent_id: UUID | None = None
    display_order: int
    is_active: bool


class CategoryCreate(APIModel):
    name: str
    kind: str = "blog"
    slug: str | None = None
    description: str | None = None
    parent_id: UUID | None = None
    display_order: int = 0


class CategoryUpdate(APIModel):
    name: str | None = None
    description: str | None = None
    display_order: int | None = None
    is_active: bool | None = None


class DocumentCategoryRead(APIModel):
    id: UUID
    code: str
    name: str
    description: str | None = None
    bucket: str
    is_kyc: bool
    is_required: bool
    accepted_types: list[str] = []
    display_order: int
    is_active: bool


# --- Repositories and services -------------------------------------------------


class FinancialYearRepository(BaseRepository[FinancialYear]):
    model = FinancialYear
    searchable_fields = ("code", "label")
    sortable_fields = ("start_date", "code")
    default_sort = "start_date"


class CategoryRepository(BaseRepository[Category]):
    model = Category
    searchable_fields = ("name", "slug")
    sortable_fields = ("display_order", "name", "created_at")
    default_sort = "display_order"


class CategoryService(BaseService[Category, CategoryRepository]):
    module = Module.CMS

    async def _before_create(self, data: dict[str, Any], auth: Any) -> dict[str, Any]:
        if not data.get("slug"):
            data["slug"] = (
                str(data["name"]).lower().replace("&", "and").strip()
                .replace(" ", "-").replace("/", "-")
            )
        if await self.repo.get_by(slug=data["slug"]) is not None:
            raise ConflictError(f"A category with slug '{data['slug']}' already exists.")
        return data


def category_service(session: DbSession) -> CategoryService:  # type: ignore[valid-type]
    return CategoryService(CategoryRepository(session))


# --- Financial years -----------------------------------------------------------


@router.get(
    "/financial-years",
    response_model=SuccessResponse[list[FinancialYearRead]],
    summary="Financial years",
)
async def list_financial_years(
    request: Request, session: DbSession, auth: CurrentUser
) -> SuccessResponse[list[FinancialYearRead]]:
    rows = (
        await session.execute(select(FinancialYear).order_by(FinancialYear.start_date.desc()))
    ).scalars().all()
    return SuccessResponse[list[FinancialYearRead]](
        data=[FinancialYearRead.model_validate(r) for r in rows], request_id=_rid(request)
    )


@router.get(
    "/financial-years/current",
    response_model=SuccessResponse[FinancialYearRead],
    summary="The financial year containing today",
)
async def current_financial_year(
    request: Request, session: DbSession, auth: OptionalUser
) -> SuccessResponse[FinancialYearRead]:
    row = (
        await session.execute(select(FinancialYear).where(FinancialYear.is_current.is_(True)))
    ).scalars().first()
    if row is None:
        raise NotFoundError("Current financial year")
    return SuccessResponse[FinancialYearRead](
        data=FinancialYearRead.model_validate(row), request_id=_rid(request)
    )


@router.post(
    "/financial-years/{year_id}/lock",
    response_model=MessageResponse,
    summary="Lock a financial year (admin)",
    description="A locked year rejects new vouchers and invoices at the database "
    "level, so closed books cannot be altered by any caller.",
)
async def lock_financial_year(
    request: Request, year_id: UUID, session: DbSession, auth: AdminUser
) -> MessageResponse:
    row = await session.get(FinancialYear, year_id)
    if row is None:
        raise NotFoundError("Financial year", year_id)
    if row.is_locked:
        raise ConflictError("That financial year is already locked.")

    row.is_locked = True
    row.locked_at = datetime.now(timezone.utc)
    row.locked_by = auth.user_id
    await session.flush()
    return MessageResponse(message=f"{row.label} locked.", request_id=_rid(request))


@router.post(
    "/financial-years/{year_id}/unlock",
    response_model=MessageResponse,
    summary="Reopen a locked financial year (admin)",
)
async def unlock_financial_year(
    request: Request, year_id: UUID, session: DbSession, auth: AdminUser
) -> MessageResponse:
    row = await session.get(FinancialYear, year_id)
    if row is None:
        raise NotFoundError("Financial year", year_id)

    row.is_locked = False
    row.locked_at = None
    row.locked_by = None
    await session.flush()
    return MessageResponse(message=f"{row.label} reopened.", request_id=_rid(request))


# --- Document categories --------------------------------------------------------


@router.get(
    "/document-categories",
    response_model=SuccessResponse[list[DocumentCategoryRead]],
    summary="Document vault categories",
)
async def list_document_categories(
    request: Request,
    session: DbSession,
    auth: OptionalUser,
    kyc_only: Annotated[bool, Query(description="Only KYC categories")] = False,
) -> SuccessResponse[list[DocumentCategoryRead]]:
    stmt = select(DocumentCategory).where(DocumentCategory.is_active.is_(True))
    if kyc_only:
        stmt = stmt.where(DocumentCategory.is_kyc.is_(True))
    rows = (await session.execute(stmt.order_by(DocumentCategory.display_order))).scalars().all()
    return SuccessResponse[list[DocumentCategoryRead]](
        data=[DocumentCategoryRead.model_validate(r) for r in rows], request_id=_rid(request)
    )


# --- Categories ------------------------------------------------------------------


@router.get(
    "/categories/public",
    response_model=SuccessResponse[list[CategoryRead]],
    summary="Content categories (public)",
)
async def public_categories(
    request: Request,
    session: DbSession,
    kind: Annotated[str, Query(pattern="^(blog|download|faq|service)$")] = "blog",
) -> SuccessResponse[list[CategoryRead]]:
    rows = (
        await session.execute(
            select(Category)
            .where(Category.kind == kind, Category.is_active.is_(True))
            .order_by(Category.display_order)
        )
    ).scalars().all()
    return SuccessResponse[list[CategoryRead]](
        data=[CategoryRead.model_validate(r) for r in rows], request_id=_rid(request)
    )


async def category_filters(
    kind: Annotated[str | None, Query(pattern="^(blog|download|faq|service)$")] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"kind": kind, "is_active": is_active}.items() if v is not None}


categories_router: APIRouter = build_crud_router(
    service_factory=lambda s: CategoryService(CategoryRepository(s)),
    read_schema=CategoryRead,
    create_schema=CategoryCreate,
    update_schema=CategoryUpdate,
    module=Module.CMS,
    resource_name="category",
    filter_dependency=category_filters,
)
