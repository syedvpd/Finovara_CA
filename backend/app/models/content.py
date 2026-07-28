"""Notifications, client communication, website CMS, and the audit trail."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy.orm import Mapped, relationship

from app.db.base import (
    created_ts,
    Base,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    bigint_col,
    bool_col,
    fk,
    int_col,
    json_col,
    str_col,
    text_col,
    ts_col,
    uuid_col,
)

# --- Notifications -----------------------------------------------------------


class NotificationTemplate(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "notification_templates"

    name: Mapped[str] = str_col(100, unique=True)
    code: Mapped[str] = str_col(50, unique=True)
    channel: Mapped[str] = str_col(20)
    subject_template: Mapped[str | None] = text_col()
    body_template: Mapped[str] = text_col(nullable=False)


class Notification(Base, UUIDPrimaryKeyMixin):
    """Queued outbound message. The dispatch worker drains status='pending'."""

    __tablename__ = "notifications"

    recipient_id: Mapped[uuid.UUID] = fk("users.id")
    template_id: Mapped[uuid.UUID | None] = fk("notification_templates.id", ondelete="SET NULL", nullable=True)
    channel: Mapped[str] = str_col(20)
    subject: Mapped[str | None] = str_col(200, nullable=True)
    body: Mapped[str] = text_col(nullable=False)
    status: Mapped[str] = str_col(20, default="pending")
    send_after: Mapped[datetime | None] = ts_col()
    sent_at: Mapped[datetime | None] = ts_col()
    read_at: Mapped[datetime | None] = ts_col()
    error_message: Mapped[str | None] = text_col()
    retry_count: Mapped[int] = int_col(default=0)
    created_at: Mapped[datetime] = created_ts()


# --- Client communication ----------------------------------------------------


class Query(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A client-raised support ticket."""

    __tablename__ = "queries"

    client_id: Mapped[uuid.UUID] = fk("clients.id")
    task_id: Mapped[uuid.UUID | None] = fk("tasks.id", ondelete="SET NULL", nullable=True)
    raised_by: Mapped[uuid.UUID] = fk("users.id", ondelete="RESTRICT")
    assigned_to: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
    subject: Mapped[str] = str_col(150)
    query_text: Mapped[str] = text_col(nullable=False)
    status: Mapped[str] = str_col(30, default="open")

    responses: Mapped[list[QueryResponse]] = relationship(
        lazy="selectin", primaryjoin="Query.id == QueryResponse.query_id"
    )


class QueryResponse(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "query_responses"

    query_id: Mapped[uuid.UUID] = fk("queries.id")
    user_id: Mapped[uuid.UUID] = fk("users.id", ondelete="RESTRICT")
    response_text: Mapped[str] = text_col(nullable=False)
    created_at: Mapped[datetime] = created_ts()


class ChatMessage(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "chat_messages"

    client_id: Mapped[uuid.UUID] = fk("clients.id")
    employee_id: Mapped[uuid.UUID | None] = fk("employees.id", ondelete="SET NULL", nullable=True)
    sender_type: Mapped[str] = str_col(20)
    message_text: Mapped[str] = text_col(nullable=False)
    is_read: Mapped[bool] = bool_col()
    created_at: Mapped[datetime] = created_ts()


class CommunicationLog(Base, UUIDPrimaryKeyMixin):
    """Immutable staff record of an external or internal client interaction."""

    __tablename__ = "communication_logs"

    client_id: Mapped[uuid.UUID] = fk("clients.id")
    created_by: Mapped[uuid.UUID] = fk("users.id", ondelete="RESTRICT")
    communication_type: Mapped[str] = str_col(20)
    direction: Mapped[str] = str_col(20)
    subject: Mapped[str] = str_col(200)
    body: Mapped[str] = text_col(nullable=False)
    created_at: Mapped[datetime] = created_ts()


# --- Website CMS -------------------------------------------------------------


class Blog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "blogs"

    title: Mapped[str] = str_col(200)
    slug: Mapped[str] = str_col(200, unique=True)
    summary: Mapped[str | None] = text_col()
    content: Mapped[str] = text_col(nullable=False)
    featured_image: Mapped[str | None] = text_col()
    meta_title: Mapped[str | None] = str_col(150, nullable=True)
    meta_description: Mapped[str | None] = str_col(255, nullable=True)
    status: Mapped[str] = str_col(20, default="draft")
    published_at: Mapped[datetime | None] = ts_col()
    author_id: Mapped[uuid.UUID | None] = fk("employees.id", ondelete="SET NULL", nullable=True)


class Download(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "downloads"

    title: Mapped[str] = str_col(150)
    file_path: Mapped[str] = text_col(nullable=False)
    file_size: Mapped[int] = bigint_col()
    description: Mapped[str | None] = text_col()
    download_count: Mapped[int] = int_col(default=0)
    is_public: Mapped[bool] = bool_col(default=True)


class Career(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "careers"

    job_title: Mapped[str] = str_col(100)
    department: Mapped[str] = str_col(50)
    location: Mapped[str] = str_col(100)
    description: Mapped[str] = text_col(nullable=False)
    requirements: Mapped[str] = text_col(nullable=False)
    status: Mapped[str] = str_col(20, default="open")


class CareerApplication(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "career_applications"

    career_id: Mapped[uuid.UUID] = fk("careers.id")
    applicant_name: Mapped[str] = str_col(150)
    applicant_email: Mapped[str] = str_col(320)
    applicant_phone: Mapped[str] = str_col(20)
    resume_path: Mapped[str] = text_col(nullable=False)
    cover_letter: Mapped[str | None] = text_col()
    status: Mapped[str] = str_col(30, default="applied")
    created_at: Mapped[datetime] = created_ts()


class WebsiteSetting(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "website_settings"

    key: Mapped[str] = str_col(100, unique=True)
    value: Mapped[dict] = json_col()
    updated_at: Mapped[datetime] = created_ts()


# --- Audit trail -------------------------------------------------------------


class ActivityLog(Base, UUIDPrimaryKeyMixin):
    """Written by database triggers; never mutated from the application."""

    __tablename__ = "activity_logs"

    user_id: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
    action: Mapped[str] = str_col(50)
    entity_name: Mapped[str] = str_col(100)
    entity_id: Mapped[uuid.UUID] = uuid_col()  # polymorphic target id; no FK by design
    old_values: Mapped[dict | None] = json_col(nullable=True)
    new_values: Mapped[dict | None] = json_col(nullable=True)
    ip_address: Mapped[str | None] = str_col(45, nullable=True)
    user_agent: Mapped[str | None] = text_col()
    created_at: Mapped[datetime] = created_ts()


class Testimonial(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Client testimonial shown on the marketing site (PRD; homepage §11)."""

    __tablename__ = "testimonials"

    client_id: Mapped[uuid.UUID | None] = fk("clients.id", ondelete="SET NULL", nullable=True)
    author_name: Mapped[str] = str_col(150)
    author_role: Mapped[str | None] = str_col(150, nullable=True)
    company_name: Mapped[str | None] = str_col(150, nullable=True)
    avatar_url: Mapped[str | None] = text_col()
    rating: Mapped[int] = int_col(default=5)
    quote: Mapped[str] = text_col(nullable=False)
    service_id: Mapped[uuid.UUID | None] = fk("services.id", ondelete="SET NULL", nullable=True)
    is_featured: Mapped[bool] = bool_col()
    status: Mapped[str] = str_col(20, default="draft")
    display_order: Mapped[int] = int_col(default=0)
    published_at: Mapped[datetime | None] = ts_col()
    created_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
    updated_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
