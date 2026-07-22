"""Generic CRUD service.

Holds the authorization decision and the extension points (``_before_create``,
``_check_transition``, …) that individual modules override with their business
rules. Routers stay thin; rules live here.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any, Generic, TypeVar
from uuid import UUID

from app.core.exceptions import ForbiddenError, InvalidStateTransitionError
from app.core.logging import get_logger
from app.core.permissions import Action, Module, perm
from app.core.security import AuthContext
from app.db.base import Base
from app.repositories.base import BaseRepository
from app.schemas.common import PaginationParams, SortParams

logger = get_logger(__name__)

ModelT = TypeVar("ModelT", bound=Base)
RepoT = TypeVar("RepoT", bound=BaseRepository[Any])


class BaseService(Generic[ModelT, RepoT]):
    """CRUD with authorization, scoping, and workflow hooks."""

    module: Module
    #: Allowed status transitions, e.g. ``{"draft": {"sent", "void"}}``.
    #: Empty means the module has no state machine.
    transitions: dict[str, set[str]] = {}
    status_field: str = "status"

    def __init__(self, repository: RepoT) -> None:
        self.repo = repository

    # --- Authorization -------------------------------------------------------

    def _require(self, auth: AuthContext, action: Action) -> None:
        required = perm(self.module, action)
        if not auth.can(required):
            raise ForbiddenError(
                "You do not have permission to perform this action.",
                details={"required_permission": required},
            )

    # --- Workflow ------------------------------------------------------------

    def _check_transition(self, entity: ModelT, new_status: str | None) -> None:
        """Reject illegal status moves before they reach the database."""
        if not self.transitions or new_status is None:
            return
        current = getattr(entity, self.status_field, None)
        if current is None or current == new_status:
            return
        if new_status not in self.transitions.get(current, set()):
            raise InvalidStateTransitionError(self.repo.model.__name__, current, new_status)

    # --- Extension points ----------------------------------------------------

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        return data

    async def _after_create(self, entity: ModelT, auth: AuthContext) -> None:
        return None

    async def _before_update(self, entity: ModelT, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        return data

    async def _after_update(self, entity: ModelT, auth: AuthContext) -> None:
        return None

    async def _before_delete(self, entity: ModelT, auth: AuthContext) -> None:
        return None

    # --- Operations ----------------------------------------------------------

    async def list(
        self,
        auth: AuthContext,
        *,
        pagination: PaginationParams | None = None,
        sort: SortParams | None = None,
        search: str | None = None,
        filters: dict[str, Any] | None = None,
    ) -> tuple[Sequence[ModelT], int]:
        self._require(auth, Action.READ)
        return await self.repo.list(
            auth=auth, pagination=pagination, sort=sort, search=search, filters=filters
        )

    async def get(self, entity_id: UUID, auth: AuthContext) -> ModelT:
        self._require(auth, Action.READ)
        return await self.repo.get_scoped_or_404(entity_id, auth)

    async def create(self, data: dict[str, Any], auth: AuthContext) -> ModelT:
        self._require(auth, Action.CREATE)
        payload = await self._before_create(dict(data), auth)

        # A client account may only ever create rows against itself.
        if auth.is_client and self.repo.client_column:
            payload[self.repo.client_column] = auth.client_id

        entity = await self.repo.create(payload, actor_id=auth.user_id)
        await self._after_create(entity, auth)
        logger.info("entity_created", entity=self.repo.model.__name__, entity_id=str(entity.id))
        return entity

    async def update(self, entity_id: UUID, data: dict[str, Any], auth: AuthContext) -> ModelT:
        self._require(auth, Action.UPDATE)
        entity = await self.repo.get_scoped_or_404(entity_id, auth)

        payload = {k: v for k, v in data.items() if v is not None}
        self._check_transition(entity, payload.get(self.status_field))
        payload = await self._before_update(entity, payload, auth)

        updated = await self.repo.update(entity, payload, actor_id=auth.user_id)
        await self._after_update(updated, auth)
        logger.info("entity_updated", entity=self.repo.model.__name__, entity_id=str(entity_id))
        return updated

    async def delete(self, entity_id: UUID, auth: AuthContext) -> None:
        self._require(auth, Action.DELETE)
        entity = await self.repo.get_scoped_or_404(entity_id, auth)
        await self._before_delete(entity, auth)
        await self.repo.delete(entity, actor_id=auth.user_id)
        logger.info("entity_deleted", entity=self.repo.model.__name__, entity_id=str(entity_id))
