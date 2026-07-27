"""Website CMS, careers, downloads, contact requests, and system settings."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import Bucket
from app.core.exceptions import AlreadyExistsError, ConflictError, ForbiddenError, NotFoundError
from app.core.logging import get_logger
from app.core.permissions import Action, Module
from app.core.security import AuthContext
from app.models.content import Blog, Career, CareerApplication, Download, Testimonial, WebsiteSetting
from app.models.system import AppSetting, ContactRequest
from app.repositories.content import (
    BlogRepository,
    CareerApplicationRepository,
    CareerRepository,
    DownloadRepository,
    TestimonialRepository,
    WebsiteSettingRepository,
)
from app.repositories.system import AppSettingRepository, ContactRequestRepository
from app.services.base import BaseService
from app.services.storage import get_storage, sanitize_filename, validate_upload
from app.services import email_templates
from app.services.email import is_configured as email_configured, send as send_email

logger = get_logger(__name__)


class BlogService(BaseService[Blog, BlogRepository]):
    module = Module.CMS
    transitions = {
        "draft": {"scheduled", "published"},
        "scheduled": {"published", "draft"},
        "published": {"draft"},
    }

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if await self.repo.slug_taken(data["slug"]):
            raise AlreadyExistsError(f"A post with the slug '{data['slug']}' already exists.")
        data.setdefault("status", "draft")
        if auth.employee_id:
            data.setdefault("author_id", auth.employee_id)
        return data

    async def _before_update(self, entity: Blog, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        # Publishing without a timestamp would hide the post from the public
        # feed, which filters on published_at.
        if data.get("status") == "published" and not (data.get("published_at") or entity.published_at):
            data["published_at"] = datetime.now(timezone.utc)

        if data.get("status") == "scheduled" and not (data.get("published_at") or entity.published_at):
            raise ConflictError("A scheduled post needs a publication date.")
        return data

    async def public_feed(self, limit: int = 10) -> list[Blog]:
        """Published posts for the marketing site. No authentication required."""
        return await self.repo.published(limit)

    async def public_by_slug(self, slug: str) -> Blog:
        post = await self.repo.get_by_slug(slug)
        now = datetime.now(timezone.utc)
        if post is None or post.status != "published" or not post.published_at or post.published_at > now:
            raise NotFoundError("Article", slug)
        return post


class CareerService(BaseService[Career, CareerRepository]):
    module = Module.CMS
    transitions = {"open": {"closed"}, "closed": {"open"}}

    async def public_openings(self) -> list[Career]:
        rows, _ = await self.repo.list(filters={"status": "open"})
        return list(rows)


class CareerApplicationService(BaseService[CareerApplication, CareerApplicationRepository]):
    module = Module.CMS
    transitions = {
        "applied": {"reviewing", "rejected"},
        "reviewing": {"interviewed", "rejected"},
        "interviewed": {"offered", "rejected"},
        "offered": {"rejected"},
        "rejected": set(),
    }

    async def submit(self, data: dict[str, Any]) -> CareerApplication:
        """Public application. Unauthenticated by design."""
        career = await CareerRepository(self.repo.session).get(data["career_id"])
        if career is None or career.status != "open":
            raise NotFoundError("Vacancy", data["career_id"])

        data.setdefault("status", "applied")
        data.setdefault("created_at", datetime.now(timezone.utc))
        return await self.repo.create(data)

    async def submit_with_resume(
        self, data: dict[str, Any], *, filename: str, content: bytes, content_type: str
    ) -> CareerApplication:
        """Store the CV, then record the application.

        The vacancy is checked before anything is written, so a closed or
        unknown posting cannot be used to push files into storage.
        """
        career_id = data["career_id"]
        career = await CareerRepository(self.repo.session).get(career_id)
        if career is None or career.status != "open":
            raise NotFoundError("Vacancy", career_id)

        validate_upload(filename, content_type, len(content), content[:2048])

        safe = sanitize_filename(filename)
        path = f"{career_id}/{uuid4().hex}-{safe}"
        await get_storage().upload(
            Bucket.CAREER_APPLICATIONS.value, path, content, content_type=content_type
        )

        data["resume_path"] = path
        return await self.submit(data)


class DownloadService(BaseService[Download, DownloadRepository]):
    module = Module.CMS

    async def public_list(self) -> list[Download]:
        rows, _ = await self.repo.list(filters={"is_public": True})
        return list(rows)

    async def register_download(self, download_id: UUID) -> Download:
        item = await self.repo.get(download_id)
        if item is None or not item.is_public:
            raise NotFoundError("Download", download_id)
        await self.repo.increment_count(download_id)
        return item


    async def public_signed_url(self, download_id: UUID) -> str:
        """A short-lived link to the file, counted as a download.

        The stored object path never reaches the browser: `DownloadRead` omits
        it deliberately, and the link expires, so a shared URL stops working.
        """
        item = await self.register_download(download_id)
        return await get_storage().create_signed_url(
            Bucket.WEBSITE_ASSETS.value, item.file_path, expires_in=300
        )


class ContactRequestService(BaseService[ContactRequest, ContactRequestRepository]):
    module = Module.LEADS
    transitions = {
        # An admin can onboard (convert) or dismiss (close) a brand-new request
        # in one click from Portal Access Requests, so both are reachable from "new".
        "new": {"contacted", "converted", "closed", "spam"},
        "contacted": {"converted", "closed"},
        "converted": set(),
        "closed": {"contacted"},
        "spam": set(),
    }

    async def submit(self, data: dict[str, Any], *, ip_address: str | None = None) -> ContactRequest:
        """Public contact form. Unauthenticated; rate limited at the edge.

        Bots get the same cheerful acknowledgement as everyone else — telling
        them they were caught just teaches the next attempt what to avoid.
        """
        trap = data.pop("website", None)

        data.setdefault("status", "new")
        data.setdefault("source", "website")
        data["ip_address"] = ip_address

        if trap:
            logger.info("contact_request_honeypot_tripped", ip_address=ip_address)
            data["status"] = "spam"
        elif await self._is_duplicate(data, ip_address):
            logger.info("contact_request_duplicate_suppressed", ip_address=ip_address)
            data["status"] = "spam"

        request = await self.repo.create(data)
        logger.info("contact_request_received", request_id=str(request.id), status=data["status"])

        # Acknowledge genuine enquiries. A mail failure must never fail the
        # submission — the enquiry is already safely recorded.
        if data["status"] == "new" and email_configured():
            subject, html = email_templates.contact_acknowledgement(data.get("name", "there"))
            try:
                await send_email(to=data["email"], subject=subject, body=html)
            except Exception as exc:  # noqa: BLE001 - delivery is best effort
                logger.warning("contact_ack_failed", error=str(exc)[:200])

        return request

    async def _is_duplicate(self, data: dict[str, Any], ip_address: str | None) -> bool:
        """The same person sending the same message twice inside a minute.

        Catches double-clicked submit buttons as well as crude flooding, which
        the rate limiter alone would let through when it is keyed per IP and the
        flood comes from many addresses.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=1)
        stmt = (
            select(ContactRequest.id)
            .where(
                ContactRequest.email == data.get("email"),
                ContactRequest.message == data.get("message"),
                ContactRequest.created_at >= cutoff,
            )
            .limit(1)
        )
        return (await self.repo.session.execute(stmt)).first() is not None

    async def _before_update(
        self, entity: ContactRequest, data: dict[str, Any], auth: AuthContext
    ) -> dict[str, Any]:
        if data.get("status") and data["status"] != "new":
            data.setdefault("handled_at", datetime.now(timezone.utc))
            if auth.employee_id:
                data.setdefault("handled_by", auth.employee_id)
        return data


class WebsiteSettingService(BaseService[WebsiteSetting, WebsiteSettingRepository]):
    module = Module.CMS

    async def public_settings(self) -> dict[str, Any]:
        """Marketing-site configuration. Public by design — never put a secret here."""
        rows, _ = await self.repo.list()
        return {row.key: row.value for row in rows}

    async def upsert(self, key: str, value: Any, auth: AuthContext) -> WebsiteSetting:
        self._require(auth, Action.UPDATE)
        return await self.repo.upsert(key, value)


class AppSettingService(BaseService[AppSetting, AppSettingRepository]):
    """Operational configuration. Administrator-only."""

    module = Module.SETTINGS

    async def _guard_admin(self, auth: AuthContext) -> None:
        if not auth.is_admin:
            raise ForbiddenError("Only an administrator may change system settings.")

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        await self._guard_admin(auth)
        data["updated_by"] = auth.user_id
        return data

    async def _before_update(
        self, entity: AppSetting, data: dict[str, Any], auth: AuthContext
    ) -> dict[str, Any]:
        await self._guard_admin(auth)
        data["updated_by"] = auth.user_id
        return data

    async def upsert(self, payload: dict[str, Any], auth: AuthContext) -> AppSetting:
        await self._guard_admin(auth)
        existing = await self.repo.get_by(key=payload["key"])
        if existing is None:
            return await self.repo.create({**payload, "updated_by": auth.user_id}, actor_id=auth.user_id)
        return await self.repo.update(existing, payload, actor_id=auth.user_id)

    async def list(self, auth: AuthContext, **kwargs: Any) -> Any:
        """Sensitive settings are withheld from anyone but an administrator."""
        rows, total = await super().list(auth, **kwargs)
        if auth.is_admin:
            return rows, total
        visible = [row for row in rows if not row.is_sensitive]
        return visible, len(visible)


def blog_service(s: AsyncSession) -> BlogService:
    return BlogService(BlogRepository(s))


def career_service(s: AsyncSession) -> CareerService:
    return CareerService(CareerRepository(s))


def career_application_service(s: AsyncSession) -> CareerApplicationService:
    return CareerApplicationService(CareerApplicationRepository(s))


def download_service(s: AsyncSession) -> DownloadService:
    return DownloadService(DownloadRepository(s))


def contact_request_service(s: AsyncSession) -> ContactRequestService:
    return ContactRequestService(ContactRequestRepository(s))


def website_setting_service(s: AsyncSession) -> WebsiteSettingService:
    return WebsiteSettingService(WebsiteSettingRepository(s))


def app_setting_service(s: AsyncSession) -> AppSettingService:
    return AppSettingService(AppSettingRepository(s))


class TestimonialService(BaseService[Testimonial, TestimonialRepository]):
    module = Module.CMS
    transitions = {
        "draft": {"published", "archived"},
        "published": {"draft", "archived"},
        "archived": {"draft"},
    }

    async def _before_update(
        self, entity: Testimonial, data: dict[str, Any], auth: AuthContext
    ) -> dict[str, Any]:
        # Publishing without a timestamp would hide it from the public feed.
        if data.get("status") == "published" and not (data.get("published_at") or entity.published_at):
            data["published_at"] = datetime.now(timezone.utc)
        return data

    async def public_feed(self, limit: int = 12) -> list[Testimonial]:
        return await self.repo.published(limit)


def testimonial_service(s: AsyncSession) -> TestimonialService:
    return TestimonialService(TestimonialRepository(s))
