"""Schemas for notifications, client communication, reports, and the website CMS."""

from __future__ import annotations

import re
import uuid
from datetime import date, datetime
from typing import Annotated, Any

from pydantic import EmailStr, Field, field_validator, model_validator

from app.schemas.common import APIModel

PHONE_PATTERN = r"^\+?[0-9]{7,15}$"
CHANNELS = ("email", "sms", "whatsapp", "push", "in_app")

_SLUG_STRIP = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    return _SLUG_STRIP.sub("-", value.lower()).strip("-")[:200]


# --- Notifications -----------------------------------------------------------


class NotificationRead(APIModel):
    id: uuid.UUID
    recipient_id: uuid.UUID
    template_id: uuid.UUID | None = None
    channel: str
    subject: str | None = None
    body: str
    status: str
    send_after: datetime | None = None
    sent_at: datetime | None = None
    read_at: datetime | None = None
    retry_count: int
    created_at: datetime


class NotificationCreate(APIModel):
    recipient_id: uuid.UUID
    channel: Annotated[str, Field(pattern="^(" + "|".join(CHANNELS) + ")$")]
    body: Annotated[str, Field(min_length=1)]
    subject: Annotated[str, Field(max_length=200)] | None = None
    template_id: uuid.UUID | None = None
    send_after: datetime | None = None

    @model_validator(mode="after")
    def _email_needs_subject(self) -> NotificationCreate:
        if self.channel == "email" and not (self.subject or "").strip():
            raise ValueError("An email notification requires a subject.")
        return self


class NotificationTemplateRead(APIModel):
    id: uuid.UUID
    name: str
    code: str
    channel: str
    subject_template: str | None = None
    body_template: str
    created_at: datetime


class NotificationTemplateCreate(APIModel):
    name: Annotated[str, Field(min_length=2, max_length=100)]
    code: Annotated[str, Field(min_length=2, max_length=50)]
    channel: Annotated[str, Field(pattern="^(" + "|".join(CHANNELS) + ")$")]
    body_template: Annotated[str, Field(min_length=1)]
    subject_template: str | None = None


class NotificationTemplateUpdate(APIModel):
    name: Annotated[str, Field(min_length=2, max_length=100)] | None = None
    subject_template: str | None = None
    body_template: str | None = None


class BroadcastRequest(APIModel):
    """Queue one notification per recipient from a template."""

    template_code: Annotated[str, Field(min_length=2, max_length=50)]
    recipient_ids: Annotated[list[uuid.UUID], Field(min_length=1, max_length=1000)]
    context: dict[str, Any] = Field(default_factory=dict)
    send_after: datetime | None = None


# --- Queries and chat --------------------------------------------------------


class QueryResponseRead(APIModel):
    id: uuid.UUID
    query_id: uuid.UUID
    user_id: uuid.UUID
    response_text: str
    created_at: datetime


class QueryRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID
    task_id: uuid.UUID | None = None
    raised_by: uuid.UUID
    assigned_to: uuid.UUID | None = None
    subject: str
    query_text: str
    status: str
    created_at: datetime
    updated_at: datetime
    responses: list[QueryResponseRead] = Field(default_factory=list)


class QueryCreate(APIModel):
    client_id: uuid.UUID
    subject: Annotated[str, Field(min_length=2, max_length=150)]
    query_text: Annotated[str, Field(min_length=1)]
    task_id: uuid.UUID | None = None


class QueryUpdate(APIModel):
    status: Annotated[str, Field(pattern="^(open|answered|resolved|closed)$")] | None = None
    assigned_to: uuid.UUID | None = None
    subject: Annotated[str, Field(min_length=2, max_length=150)] | None = None


class QueryReply(APIModel):
    response_text: Annotated[str, Field(min_length=1)]


class ChatMessageRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID
    employee_id: uuid.UUID | None = None
    sender_type: str
    message_text: str
    is_read: bool
    created_at: datetime


class ChatMessageCreate(APIModel):
    client_id: uuid.UUID
    message_text: Annotated[str, Field(min_length=1, max_length=4000)]


class CommunicationLogRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID
    created_by: uuid.UUID
    communication_type: str
    direction: str
    subject: str
    body: str
    created_at: datetime


class CommunicationLogCreate(APIModel):
    client_id: uuid.UUID
    communication_type: Annotated[str, Field(pattern="^(call|email|handoff)$")]
    direction: Annotated[str, Field(pattern="^(inbound|outbound|internal)$")]
    subject: Annotated[str, Field(min_length=2, max_length=200)]
    body: Annotated[str, Field(min_length=1, max_length=10000)]

    @model_validator(mode="after")
    def _handoff_is_internal(self) -> CommunicationLogCreate:
        if self.communication_type == "handoff" and self.direction != "internal":
            raise ValueError("A handoff note must be marked internal.")
        if self.communication_type != "handoff" and self.direction == "internal":
            raise ValueError("Only handoff notes may be marked internal.")
        return self


# --- Reports -----------------------------------------------------------------


class ReportRead(APIModel):
    id: uuid.UUID
    template_id: uuid.UUID | None = None
    client_id: uuid.UUID | None = None
    branch_id: uuid.UUID | None = None
    title: str
    report_type: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    period_start: date | None = None
    period_end: date | None = None
    format: str
    status: str
    file_size: int | None = None
    error_message: str | None = None
    generated_at: datetime | None = None
    expires_at: datetime | None = None
    is_shared_with_client: bool
    created_at: datetime


class ReportRequest(APIModel):
    title: Annotated[str, Field(min_length=2, max_length=200)]
    report_type: Annotated[str, Field(min_length=2, max_length=50)]
    client_id: uuid.UUID | None = None
    branch_id: uuid.UUID | None = None
    template_id: uuid.UUID | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)
    period_start: date | None = None
    period_end: date | None = None
    format: Annotated[str, Field(pattern="^(pdf|xlsx|csv)$")] = "pdf"

    @model_validator(mode="after")
    def _period_ordered(self) -> ReportRequest:
        if self.period_start and self.period_end and self.period_end < self.period_start:
            raise ValueError("The period end cannot precede the period start.")
        return self


class ReportShare(APIModel):
    is_shared_with_client: bool


class ReportTemplateRead(APIModel):
    id: uuid.UUID
    name: str
    code: str
    module: str
    description: str | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)
    output_formats: list[str] = Field(default_factory=list)


# --- Website CMS -------------------------------------------------------------


class BlogRead(APIModel):
    id: uuid.UUID
    title: str
    slug: str
    summary: str | None = None
    content: str
    featured_image: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    status: str
    published_at: datetime | None = None
    author_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class BlogCreate(APIModel):
    title: Annotated[str, Field(min_length=2, max_length=200)]
    content: Annotated[str, Field(min_length=1)]
    slug: Annotated[str, Field(max_length=200)] | None = None
    summary: str | None = None
    featured_image: str | None = None
    meta_title: Annotated[str, Field(max_length=150)] | None = None
    meta_description: Annotated[str, Field(max_length=255)] | None = None

    @model_validator(mode="after")
    def _derive_slug(self) -> BlogCreate:
        if not self.slug:
            object.__setattr__(self, "slug", slugify(self.title))
        else:
            object.__setattr__(self, "slug", slugify(self.slug))
        return self


class BlogUpdate(APIModel):
    title: Annotated[str, Field(min_length=2, max_length=200)] | None = None
    content: str | None = None
    summary: str | None = None
    featured_image: str | None = None
    meta_title: Annotated[str, Field(max_length=150)] | None = None
    meta_description: Annotated[str, Field(max_length=255)] | None = None
    status: Annotated[str, Field(pattern="^(draft|scheduled|published)$")] | None = None
    published_at: datetime | None = None


class CareerRead(APIModel):
    id: uuid.UUID
    job_title: str
    department: str
    location: str
    description: str
    requirements: str
    status: str
    created_at: datetime


class CareerCreate(APIModel):
    job_title: Annotated[str, Field(min_length=2, max_length=100)]
    department: Annotated[str, Field(max_length=50)]
    location: Annotated[str, Field(max_length=100)]
    description: Annotated[str, Field(min_length=1)]
    requirements: Annotated[str, Field(min_length=1)]


class CareerUpdate(APIModel):
    job_title: Annotated[str, Field(min_length=2, max_length=100)] | None = None
    description: str | None = None
    requirements: str | None = None
    status: Annotated[str, Field(pattern="^(open|closed)$")] | None = None


class CareerApplicationRead(APIModel):
    id: uuid.UUID
    career_id: uuid.UUID
    applicant_name: str
    applicant_email: str
    applicant_phone: str
    cover_letter: str | None = None
    status: str
    created_at: datetime
    # resume_path is withheld; staff fetch it through a signed URL.


class CareerApplicationUpdate(APIModel):
    status: Annotated[str, Field(pattern="^(applied|reviewing|interviewed|offered|rejected)$")]


class DownloadRead(APIModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    file_size: int
    download_count: int
    is_public: bool
    created_at: datetime


class DownloadCreate(APIModel):
    title: Annotated[str, Field(min_length=2, max_length=150)]
    file_path: Annotated[str, Field(min_length=1)]
    file_size: Annotated[int, Field(ge=0)]
    description: str | None = None
    is_public: bool = True


class ContactRequestRead(APIModel):
    id: uuid.UUID
    name: str
    email: str
    phone: str | None = None
    subject: str | None = None
    message: str
    service_id: uuid.UUID | None = None
    source: str
    status: str
    lead_id: uuid.UUID | None = None
    handled_by: uuid.UUID | None = None
    handled_at: datetime | None = None
    created_at: datetime


class ContactRequestCreate(APIModel):
    """Public website contact form. Unauthenticated."""

    name: Annotated[str, Field(min_length=2, max_length=150)]
    email: EmailStr
    message: Annotated[str, Field(min_length=10, max_length=5000)]
    phone: Annotated[str, Field(pattern=PHONE_PATTERN)] | None = None
    subject: Annotated[str, Field(max_length=200)] | None = None
    service_id: uuid.UUID | None = None
    # Honeypot: hidden in the form, so only a bot filling every field sets it.
    # Named plausibly on purpose — "honeypot" would be trivial to skip.
    website: Annotated[str, Field(max_length=200)] | None = None


class ContactRequestUpdate(APIModel):
    status: Annotated[str, Field(pattern="^(new|contacted|converted|closed|spam)$")] | None = None


class WebsiteSettingRead(APIModel):
    id: uuid.UUID
    key: str
    value: Any
    updated_at: datetime


class WebsiteSettingUpsert(APIModel):
    key: Annotated[str, Field(min_length=1, max_length=100)]
    value: Any


class AppSettingRead(APIModel):
    id: uuid.UUID
    key: str
    value: Any
    category: str
    description: str | None = None
    is_sensitive: bool
    updated_at: datetime


class AppSettingUpsert(APIModel):
    key: Annotated[str, Field(min_length=1, max_length=100)]
    value: Any
    category: Annotated[str, Field(max_length=50)] = "general"
    description: str | None = None
    is_sensitive: bool = False


# --- Testimonials ------------------------------------------------------------


class TestimonialRead(APIModel):
    id: uuid.UUID
    author_name: str
    author_role: str | None = None
    company_name: str | None = None
    avatar_url: str | None = None
    rating: int
    quote: str
    is_featured: bool
    status: str
    display_order: int
    published_at: datetime | None = None
    created_at: datetime


class TestimonialCreate(APIModel):
    author_name: Annotated[str, Field(min_length=2, max_length=150)]
    quote: Annotated[str, Field(min_length=10)]
    author_role: Annotated[str, Field(max_length=150)] | None = None
    company_name: Annotated[str, Field(max_length=150)] | None = None
    avatar_url: str | None = None
    rating: Annotated[int, Field(ge=1, le=5)] = 5
    client_id: uuid.UUID | None = None
    service_id: uuid.UUID | None = None
    is_featured: bool = False
    display_order: int = 0


class TestimonialUpdate(APIModel):
    author_name: Annotated[str, Field(min_length=2, max_length=150)] | None = None
    author_role: Annotated[str, Field(max_length=150)] | None = None
    company_name: Annotated[str, Field(max_length=150)] | None = None
    quote: Annotated[str, Field(min_length=10)] | None = None
    rating: Annotated[int, Field(ge=1, le=5)] | None = None
    is_featured: bool | None = None
    display_order: int | None = None
    status: Annotated[str, Field(pattern="^(draft|published|archived)$")] | None = None
