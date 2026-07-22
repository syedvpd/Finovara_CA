"""Repositories for settings, contact requests, and reports."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select

from app.models.system import AppSetting, ContactRequest, Report, ReportTemplate
from app.repositories.base import BaseRepository


class AppSettingRepository(BaseRepository[AppSetting]):
    model = AppSetting
    searchable_fields = ("key", "description")
    sortable_fields = ("key", "category", "updated_at")
    default_sort = "key"

    async def get_value(self, key: str, default: Any = None) -> Any:
        """Read a setting's value, falling back when it is not configured.

        Callers use this instead of module-level constants so operational
        parameters stay editable without a deployment.
        """
        setting = (
            await self.session.execute(select(AppSetting).where(AppSetting.key == key))
        ).scalars().first()
        return setting.value if setting is not None else default

    async def set_value(self, key: str, value: Any, actor_id: UUID | None = None) -> AppSetting:
        setting = (
            await self.session.execute(select(AppSetting).where(AppSetting.key == key))
        ).scalars().first()
        if setting is None:
            return await self.create({"key": key, "value": value, "updated_by": actor_id})
        setting.value = value
        setting.updated_by = actor_id
        await self.session.flush()
        return setting


class ContactRequestRepository(BaseRepository[ContactRequest]):
    model = ContactRequest
    searchable_fields = ("name", "email", "subject", "message")
    sortable_fields = ("name", "status", "created_at")


class ReportTemplateRepository(BaseRepository[ReportTemplate]):
    model = ReportTemplate
    searchable_fields = ("name", "code", "description")
    sortable_fields = ("name", "module", "created_at")
    default_sort = "name"


class ReportRepository(BaseRepository[Report]):
    model = Report
    searchable_fields = ("title", "report_type")
    sortable_fields = ("title", "status", "report_type", "generated_at", "created_at")
    client_column = "client_id"
    branch_column = "branch_id"

    async def claim_next_queued(self) -> Report | None:
        """Take the oldest queued report, skipping rows another worker holds."""
        stmt = (
            select(Report)
            .where(Report.status == "queued")
            .order_by(Report.created_at.asc())
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        report = (await self.session.execute(stmt)).scalars().first()
        if report is not None:
            report.status = "generating"
            await self.session.flush()
        return report

    async def expire_stale(self, now: datetime | None = None) -> int:
        now = now or datetime.now(timezone.utc)
        stmt = self.base_query().where(
            Report.status == "ready", Report.expires_at.is_not(None), Report.expires_at < now
        )
        rows = list((await self.session.execute(stmt)).scalars().all())
        for row in rows:
            row.status = "expired"
        await self.session.flush()
        return len(rows)
