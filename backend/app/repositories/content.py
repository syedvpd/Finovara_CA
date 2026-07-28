"""Repositories for notifications, client communication, and the website CMS."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select, update

from app.models.content import (
    Blog,
    Career,
    CareerApplication,
    ChatMessage,
    CommunicationLog,
    Download,
    Notification,
    NotificationTemplate,
    Query,
    QueryResponse,
    Testimonial,
    WebsiteSetting,
)
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    model = Notification
    searchable_fields = ("subject", "body")
    sortable_fields = ("created_at", "status", "channel", "sent_at")

    async def unread_count(self, user_id: UUID) -> int:
        total = await self.session.scalar(
            select(func.count()).select_from(Notification).where(
                Notification.recipient_id == user_id, Notification.read_at.is_(None)
            )
        )
        return int(total or 0)

    async def mark_read(self, notification_id: UUID, user_id: UUID) -> bool:
        result = await self.session.execute(
            update(Notification)
            .where(Notification.id == notification_id, Notification.recipient_id == user_id)
            .values(read_at=datetime.now(timezone.utc), status="read")
        )
        await self.session.flush()
        return bool(result.rowcount)

    async def mark_all_read(self, user_id: UUID) -> int:
        result = await self.session.execute(
            update(Notification)
            .where(Notification.recipient_id == user_id, Notification.read_at.is_(None))
            .values(read_at=datetime.now(timezone.utc), status="read")
        )
        await self.session.flush()
        return int(result.rowcount or 0)

    async def claim_pending(self, limit: int = 50) -> list[Notification]:
        """Take a batch of due notifications for dispatch.

        ``skip_locked`` lets several workers drain the queue concurrently
        without handing the same row to two of them.
        """
        now = datetime.now(timezone.utc)
        stmt = (
            select(Notification)
            .where(
                Notification.status == "pending",
                (Notification.send_after.is_(None)) | (Notification.send_after <= now),
                Notification.retry_count < 5,
            )
            .order_by(Notification.created_at)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        return list((await self.session.execute(stmt)).scalars().all())


class NotificationTemplateRepository(BaseRepository[NotificationTemplate]):
    model = NotificationTemplate
    searchable_fields = ("name", "code")
    sortable_fields = ("name", "code", "channel", "created_at")
    default_sort = "name"

    async def get_by_code(self, code: str) -> NotificationTemplate | None:
        return await self.get_by(code=code)


class QueryRepository(BaseRepository[Query]):
    model = Query
    searchable_fields = ("subject", "query_text")
    sortable_fields = ("subject", "status", "created_at", "updated_at")
    client_column = "client_id"

    async def add_response(self, query_id: UUID, user_id: UUID, text: str) -> QueryResponse:
        response = QueryResponse(
            query_id=query_id,
            user_id=user_id,
            response_text=text,
            created_at=datetime.now(timezone.utc),
        )
        self.session.add(response)
        await self.session.flush()
        return response

    async def open_count(self, client_id: UUID | None = None) -> int:
        stmt = select(func.count()).select_from(Query).where(Query.status.in_(("open", "answered")))
        if client_id:
            stmt = stmt.where(Query.client_id == client_id)
        return int(await self.session.scalar(stmt) or 0)


class ChatMessageRepository(BaseRepository[ChatMessage]):
    model = ChatMessage
    searchable_fields = ("message_text",)
    sortable_fields = ("created_at",)
    client_column = "client_id"

    async def mark_thread_read(self, client_id: UUID, reader_is_client: bool) -> int:
        """Mark the counterparty's messages as read."""
        sender = "employee" if reader_is_client else "client"
        result = await self.session.execute(
            update(ChatMessage)
            .where(
                ChatMessage.client_id == client_id,
                ChatMessage.sender_type == sender,
                ChatMessage.is_read.is_(False),
            )
            .values(is_read=True)
        )
        await self.session.flush()
        return int(result.rowcount or 0)


class CommunicationLogRepository(BaseRepository[CommunicationLog]):
    model = CommunicationLog
    searchable_fields = ("subject", "body")
    sortable_fields = ("created_at", "communication_type", "direction")
    client_column = "client_id"


class BlogRepository(BaseRepository[Blog]):
    model = Blog
    searchable_fields = ("title", "summary", "content")
    sortable_fields = ("title", "status", "published_at", "created_at")
    default_sort = "published_at"

    async def slug_taken(self, slug: str, *, exclude_id: UUID | None = None) -> bool:
        stmt = select(Blog.id).where(Blog.slug == slug)
        if exclude_id:
            stmt = stmt.where(Blog.id != exclude_id)
        return (await self.session.execute(stmt.limit(1))).first() is not None

    async def get_by_slug(self, slug: str) -> Blog | None:
        return await self.get_by(slug=slug)

    async def published(self, limit: int = 10) -> list[Blog]:
        now = datetime.now(timezone.utc)
        stmt = (
            self.base_query()
            .where(Blog.status == "published", Blog.published_at.is_not(None), Blog.published_at <= now)
            .order_by(Blog.published_at.desc())
            .limit(limit)
        )
        return list((await self.session.execute(stmt)).scalars().all())


class CareerRepository(BaseRepository[Career]):
    model = Career
    searchable_fields = ("job_title", "department", "location", "description")
    sortable_fields = ("job_title", "department", "status", "created_at")


class CareerApplicationRepository(BaseRepository[CareerApplication]):
    model = CareerApplication
    searchable_fields = ("applicant_name", "applicant_email")
    sortable_fields = ("applicant_name", "status", "created_at")


class DownloadRepository(BaseRepository[Download]):
    model = Download
    searchable_fields = ("title", "description")
    sortable_fields = ("title", "download_count", "created_at")

    async def increment_count(self, download_id: UUID) -> None:
        await self.session.execute(
            update(Download)
            .where(Download.id == download_id)
            .values(download_count=Download.download_count + 1)
        )
        await self.session.flush()


class WebsiteSettingRepository(BaseRepository[WebsiteSetting]):
    model = WebsiteSetting
    searchable_fields = ("key",)
    sortable_fields = ("key", "updated_at")
    default_sort = "key"

    async def upsert(self, key: str, value: object) -> WebsiteSetting:
        existing = await self.get_by(key=key)
        if existing is None:
            return await self.create({"key": key, "value": value, "updated_at": datetime.now(timezone.utc)})
        existing.value = value
        existing.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return existing


class TestimonialRepository(BaseRepository[Testimonial]):
    model = Testimonial
    searchable_fields = ("author_name", "company_name", "quote")
    sortable_fields = ("display_order", "rating", "created_at", "published_at")
    default_sort = "display_order"

    async def published(self, limit: int = 12) -> list[Testimonial]:
        stmt = (
            self.base_query()
            .where(Testimonial.status == "published")
            .order_by(Testimonial.display_order, Testimonial.created_at.desc())
            .limit(limit)
        )
        return list((await self.session.execute(stmt)).scalars().all())
