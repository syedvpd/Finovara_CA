"""Notifications, client queries, and the client-consultant message thread."""

from __future__ import annotations

from datetime import datetime, timezone
from string import Template
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.core.logging import get_logger
from app.core.permissions import Action, Module
from app.core.security import AuthContext
from app.models.content import ChatMessage, Notification, NotificationTemplate, Query
from app.repositories.clients import ClientRepository
from app.repositories.content import (
    ChatMessageRepository,
    NotificationRepository,
    NotificationTemplateRepository,
    QueryRepository,
)
from app.repositories.identity import UserRepository
from app.services.base import BaseService

logger = get_logger(__name__)


def render_template(template: str, context: dict[str, Any]) -> str:
    """Fill ``$placeholder`` tokens.

    ``safe_substitute`` is used deliberately: a missing key leaves the token in
    place rather than raising, so one bad context cannot block a whole batch.
    """
    return Template(template).safe_substitute(context)


class NotificationService(BaseService[Notification, NotificationRepository]):
    module = Module.NOTIFICATIONS

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if not auth.is_staff:
            raise ForbiddenError("Only firm personnel may send notifications.")
        if await UserRepository(self.repo.session).get(data["recipient_id"]) is None:
            raise NotFoundError("Recipient", data["recipient_id"])
        data.setdefault("status", "pending")
        data.setdefault("created_at", datetime.now(timezone.utc))
        return data

    async def list(self, auth: AuthContext, **kwargs: Any) -> Any:
        """A user only ever sees their own notifications."""
        filters = dict(kwargs.pop("filters", None) or {})
        if not auth.is_admin:
            filters["recipient_id"] = auth.user_id
        return await super().list(auth, filters=filters, **kwargs)

    async def unread_count(self, auth: AuthContext) -> int:
        return await self.repo.unread_count(auth.user_id)

    async def mark_read(self, notification_id: UUID, auth: AuthContext) -> None:
        if not await self.repo.mark_read(notification_id, auth.user_id):
            raise NotFoundError("Notification", notification_id)

    async def mark_all_read(self, auth: AuthContext) -> int:
        return await self.repo.mark_all_read(auth.user_id)

    async def broadcast(self, payload: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        """Queue one notification per recipient from a stored template."""
        self._require(auth, Action.CREATE)
        if not auth.is_staff:
            raise ForbiddenError("Only firm personnel may broadcast notifications.")

        template = await NotificationTemplateRepository(self.repo.session).get_by_code(
            payload["template_code"]
        )
        if template is None:
            raise NotFoundError("Notification template", payload["template_code"])

        context = payload.get("context") or {}
        subject = render_template(template.subject_template or "", context) or None
        body = render_template(template.body_template, context)

        user_repo = UserRepository(self.repo.session)
        queued = 0
        errors: list[dict[str, Any]] = []

        for index, recipient_id in enumerate(payload["recipient_ids"]):
            if await user_repo.get(recipient_id) is None:
                errors.append({"index": index, "recipient_id": str(recipient_id), "error": "Unknown user."})
                continue
            self.repo.session.add(
                Notification(
                    recipient_id=recipient_id,
                    template_id=template.id,
                    channel=template.channel,
                    subject=subject,
                    body=body,
                    status="pending",
                    send_after=payload.get("send_after"),
                    retry_count=0,
                    created_at=datetime.now(timezone.utc),
                )
            )
            queued += 1

        await self.repo.session.flush()
        logger.info("notifications_broadcast", template=template.code, queued=queued, failed=len(errors))
        return {
            "requested": len(payload["recipient_ids"]),
            "succeeded": queued,
            "failed": len(errors),
            "errors": errors,
        }


class NotificationTemplateService(BaseService[NotificationTemplate, NotificationTemplateRepository]):
    module = Module.NOTIFICATIONS

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if not auth.is_admin:
            raise ForbiddenError("Only an administrator may manage notification templates.")
        if await self.repo.get_by_code(data["code"]) is not None:
            raise ConflictError(f"A template with code '{data['code']}' already exists.")
        return data


class QueryService(BaseService[Query, QueryRepository]):
    module = Module.QUERIES
    transitions = {
        "open": {"answered", "closed"},
        "answered": {"resolved", "open"},
        "resolved": {"closed", "open"},
        "closed": set(),
    }

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if await ClientRepository(self.repo.session).get(data["client_id"]) is None:
            raise NotFoundError("Client", data["client_id"])
        # The raiser is taken from the session, never from the payload.
        data["raised_by"] = auth.user_id
        data.setdefault("status", "open")
        return data

    async def reply(self, query_id: UUID, text: str, auth: AuthContext) -> Any:
        """Add a response. Both the client and assigned staff may reply."""
        self._require(auth, Action.UPDATE)
        query = await self.repo.get_scoped_or_404(query_id, auth)

        if query.status == "closed":
            raise ConflictError("This query is closed and no longer accepts replies.")

        response = await self.repo.add_response(query_id, auth.user_id, text)

        # A staff reply answers the query; a client reply reopens it.
        new_status = "answered" if auth.is_staff else "open"
        if query.status != new_status:
            await self.repo.update(query, {"status": new_status}, actor_id=auth.user_id)

        return response


class ChatService(BaseService[ChatMessage, ChatMessageRepository]):
    module = Module.CHAT

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        client_id = auth.client_id if auth.is_client else data.get("client_id")
        if client_id is None:
            raise ValidationError("A client must be specified.")
        if await ClientRepository(self.repo.session).get(client_id) is None:
            raise NotFoundError("Client", client_id)

        # Sender identity is derived from the session, never claimed by the payload.
        data["client_id"] = client_id
        data["sender_type"] = "client" if auth.is_client else "employee"
        data["employee_id"] = None if auth.is_client else auth.employee_id
        data["is_read"] = False
        data.setdefault("created_at", datetime.now(timezone.utc))
        return data

    async def mark_thread_read(self, client_id: UUID, auth: AuthContext) -> int:
        self._require(auth, Action.UPDATE)
        if auth.is_client and client_id != auth.client_id:
            raise ForbiddenError("You may only access your own messages.")
        return await self.repo.mark_thread_read(client_id, auth.is_client)


def notification_service(s: AsyncSession) -> NotificationService:
    return NotificationService(NotificationRepository(s))


def notification_template_service(s: AsyncSession) -> NotificationTemplateService:
    return NotificationTemplateService(NotificationTemplateRepository(s))


def query_service(s: AsyncSession) -> QueryService:
    return QueryService(QueryRepository(s))


def chat_service(s: AsyncSession) -> ChatService:
    return ChatService(ChatMessageRepository(s))
