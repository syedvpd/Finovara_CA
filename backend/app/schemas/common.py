"""Shared response envelope, pagination, filtering and sorting primitives."""

from __future__ import annotations

from datetime import datetime, timezone
from math import ceil
from typing import Annotated, Any, Generic, Literal, TypeVar

from fastapi import Query
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")

MAX_PAGE_SIZE = 200


class APIModel(BaseModel):
    """Base for every schema: ORM-friendly, strict about unknown fields."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
        extra="forbid",
    )


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ErrorResponse(BaseModel):
    success: Literal[False] = False
    error: ErrorDetail
    request_id: str | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PageMeta(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next: bool
    has_previous: bool

    @classmethod
    def build(cls, *, page: int, page_size: int, total_items: int) -> PageMeta:
        total_pages = ceil(total_items / page_size) if page_size else 0
        return cls(
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1,
        )


class SuccessResponse(BaseModel, Generic[T]):
    success: Literal[True] = True
    data: T
    request_id: str | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PaginatedResponse(BaseModel, Generic[T]):
    success: Literal[True] = True
    data: list[T]
    meta: PageMeta
    request_id: str | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MessageResponse(BaseModel):
    success: Literal[True] = True
    message: str
    request_id: str | None = None


class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 25

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


def pagination_params(
    page: Annotated[int, Query(ge=1, description="1-indexed page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE, description="Items per page")] = 25,
) -> PaginationParams:
    return PaginationParams(page=page, page_size=page_size)


class SortParams(BaseModel):
    sort_by: str | None = None
    sort_order: Literal["asc", "desc"] = "desc"


def sort_params(
    sort_by: Annotated[str | None, Query(description="Field to sort by")] = None,
    sort_order: Annotated[Literal["asc", "desc"], Query(description="Sort direction")] = "desc",
) -> SortParams:
    return SortParams(sort_by=sort_by, sort_order=sort_order)


class SearchParams(BaseModel):
    q: str | None = None


def search_params(
    q: Annotated[str | None, Query(min_length=1, max_length=200, description="Free-text search")] = None,
) -> SearchParams:
    return SearchParams(q=q)


class BulkActionResult(BaseModel):
    requested: int
    succeeded: int
    failed: int
    errors: list[dict[str, Any]] = Field(default_factory=list)


class HealthStatus(BaseModel):
    status: Literal["ok", "degraded", "unavailable"]
    version: str
    environment: str
    checks: dict[str, bool] = Field(default_factory=dict)
