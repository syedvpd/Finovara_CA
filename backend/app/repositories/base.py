"""Generic async repository.

One implementation serves every module. Subclasses declare their model and a
few class attributes; scoping, pagination, sorting, searching, and soft delete
come for free.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timezone
from typing import Any, Generic, TypeVar
from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from app.core.exceptions import NotFoundError
from app.core.security import AuthContext
from app.db.base import Base
from app.schemas.common import PaginationParams, SortParams

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """Data access for a single aggregate.

    Class attributes subclasses override:
      ``model``             the mapped class (required)
      ``searchable_fields`` columns matched by the ``q`` parameter
      ``sortable_fields``   columns permitted in ``sort_by`` (allow-list; an
                            arbitrary column name from the client would
                            otherwise be an injection surface)
      ``default_sort``      fallback ordering
      ``client_column``     column linking rows to a client, for row scoping
      ``branch_column``     column linking rows to a branch, for row scoping
    """

    model: type[ModelT]
    searchable_fields: tuple[str, ...] = ()
    sortable_fields: tuple[str, ...] = ("created_at",)
    default_sort: str = "created_at"
    client_column: str | None = None
    branch_column: str | None = None

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # --- Introspection helpers ----------------------------------------------

    @property
    def _has_soft_delete(self) -> bool:
        return hasattr(self.model, "deleted_at")

    def _column(self, name: str) -> InstrumentedAttribute[Any]:
        return getattr(self.model, name)

    def _entity_name(self) -> str:
        return self.model.__name__

    # --- Query construction --------------------------------------------------

    def base_query(self, *, include_deleted: bool = False) -> Select[tuple[ModelT]]:
        stmt = select(self.model)
        if self._has_soft_delete and not include_deleted:
            stmt = stmt.where(self._column("deleted_at").is_(None))
        return stmt

    def apply_scope(self, stmt: Select[Any], auth: AuthContext) -> Select[Any]:
        """Restrict a query to the rows this caller may see.

        Clients are pinned to their own records. Non-admin staff are limited to
        their branch when the model carries one. Admins are unrestricted.
        """
        if auth.is_client:
            if self.client_column is None:
                # A client-facing query on a model with no client linkage would
                # otherwise leak the whole table.
                return stmt.where(False)  # type: ignore[arg-type]
            return stmt.where(self._column(self.client_column) == auth.client_id)

        if auth.is_admin:
            return stmt

        if self.branch_column is not None and auth.branch_id is not None:
            return stmt.where(self._column(self.branch_column) == auth.branch_id)

        return stmt

    def apply_search(self, stmt: Select[Any], term: str | None) -> Select[Any]:
        if not term or not self.searchable_fields:
            return stmt
        pattern = f"%{term.strip()}%"
        clauses = [self._column(f).ilike(pattern) for f in self.searchable_fields]
        return stmt.where(or_(*clauses))

    def apply_filters(self, stmt: Select[Any], filters: dict[str, Any] | None) -> Select[Any]:
        """Equality/IN filters, restricted to real columns on the model."""
        if not filters:
            return stmt
        for field, value in filters.items():
            if value is None or not hasattr(self.model, field):
                continue
            column = self._column(field)
            stmt = stmt.where(column.in_(value)) if isinstance(value, (list, tuple, set)) else stmt.where(column == value)
        return stmt

    def apply_sort(self, stmt: Select[Any], sort: SortParams | None) -> Select[Any]:
        field = (sort.sort_by if sort else None) or self.default_sort
        if field not in self.sortable_fields:
            field = self.default_sort
        column = self._column(field)
        descending = sort.sort_order == "desc" if sort else True
        # Tie-break on the primary key so pagination is stable across pages.
        return stmt.order_by(column.desc() if descending else column.asc(), self._column("id"))

    # --- Reads ---------------------------------------------------------------

    async def get(self, entity_id: UUID, *, include_deleted: bool = False) -> ModelT | None:
        stmt = self.base_query(include_deleted=include_deleted).where(self._column("id") == entity_id)
        return (await self.session.execute(stmt)).scalars().first()

    async def get_or_404(self, entity_id: UUID, *, include_deleted: bool = False) -> ModelT:
        entity = await self.get(entity_id, include_deleted=include_deleted)
        if entity is None:
            raise NotFoundError(self._entity_name(), entity_id)
        return entity

    async def get_scoped_or_404(self, entity_id: UUID, auth: AuthContext) -> ModelT:
        """Fetch within the caller's scope.

        A row outside the caller's scope yields 404 rather than 403 so the API
        does not confirm that the record exists.
        """
        stmt = self.apply_scope(self.base_query(), auth).where(self._column("id") == entity_id)
        entity = (await self.session.execute(stmt)).scalars().first()
        if entity is None:
            raise NotFoundError(self._entity_name(), entity_id)
        return entity

    async def get_by(self, **criteria: Any) -> ModelT | None:
        stmt = self.apply_filters(self.base_query(), criteria)
        return (await self.session.execute(stmt)).scalars().first()

    async def exists(self, **criteria: Any) -> bool:
        stmt = self.apply_filters(select(self._column("id")), criteria).limit(1)
        return (await self.session.execute(stmt)).first() is not None

    async def count(self, *, auth: AuthContext | None = None, filters: dict[str, Any] | None = None) -> int:
        stmt = self.base_query()
        if auth is not None:
            stmt = self.apply_scope(stmt, auth)
        stmt = self.apply_filters(stmt, filters)
        total = await self.session.scalar(select(func.count()).select_from(stmt.subquery()))
        return int(total or 0)

    async def list(
        self,
        *,
        auth: AuthContext | None = None,
        pagination: PaginationParams | None = None,
        sort: SortParams | None = None,
        search: str | None = None,
        filters: dict[str, Any] | None = None,
        include_deleted: bool = False,
    ) -> tuple[Sequence[ModelT], int]:
        """Return one page of rows plus the unpaginated total."""
        stmt = self.base_query(include_deleted=include_deleted)
        if auth is not None:
            stmt = self.apply_scope(stmt, auth)
        stmt = self.apply_filters(stmt, filters)
        stmt = self.apply_search(stmt, search)

        total = int(await self.session.scalar(select(func.count()).select_from(stmt.subquery())) or 0)

        stmt = self.apply_sort(stmt, sort)
        if pagination is not None:
            stmt = stmt.offset(pagination.offset).limit(pagination.limit)

        rows = (await self.session.execute(stmt)).scalars().unique().all()
        return rows, total

    # --- Writes --------------------------------------------------------------

    async def create(self, data: dict[str, Any], *, actor_id: UUID | None = None) -> ModelT:
        payload = {k: v for k, v in data.items() if hasattr(self.model, k)}
        if actor_id is not None and hasattr(self.model, "created_by"):
            payload.setdefault("created_by", actor_id)
        if actor_id is not None and hasattr(self.model, "updated_by"):
            payload.setdefault("updated_by", actor_id)

        entity = self.model(**payload)
        self.session.add(entity)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def update(self, entity: ModelT, data: dict[str, Any], *, actor_id: UUID | None = None) -> ModelT:
        for field, value in data.items():
            # Never let a payload rewrite identity or audit columns.
            if field in ("id", "created_at", "created_by", "deleted_at", "deleted_by"):
                continue
            if hasattr(self.model, field):
                setattr(entity, field, value)

        if actor_id is not None and hasattr(self.model, "updated_by"):
            entity.updated_by = actor_id  # type: ignore[attr-defined]

        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def delete(self, entity: ModelT, *, actor_id: UUID | None = None) -> None:
        """Soft delete when the model supports it, hard delete otherwise."""
        if self._has_soft_delete:
            entity.deleted_at = datetime.now(timezone.utc)  # type: ignore[attr-defined]
            if actor_id is not None and hasattr(self.model, "deleted_by"):
                entity.deleted_by = actor_id  # type: ignore[attr-defined]
            await self.session.flush()
        else:
            await self.session.delete(entity)
            await self.session.flush()

    async def restore(self, entity: ModelT) -> ModelT:
        if self._has_soft_delete:
            entity.deleted_at = None  # type: ignore[attr-defined]
            entity.deleted_by = None  # type: ignore[attr-defined]
            await self.session.flush()
        return entity

    async def bulk_create(self, rows: list[dict[str, Any]], *, actor_id: UUID | None = None) -> list[ModelT]:
        entities = []
        for row in rows:
            payload = {k: v for k, v in row.items() if hasattr(self.model, k)}
            if actor_id is not None and hasattr(self.model, "created_by"):
                payload.setdefault("created_by", actor_id)
            entities.append(self.model(**payload))
        self.session.add_all(entities)
        await self.session.flush()
        return entities
