"""Authentication policy and forensic models.

Supabase Auth holds the credentials; these tables hold the policy state around
them — lockout, password history, devices, MFA enrolment and the audit trail.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy.orm import Mapped

from app.db.base import (
    created_ts,
    Base,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    bool_col,
    fk,
    int_col,
    json_col,
    str_col,
    text_col,
    ts_col,
    uuid_col,
)


class LoginAttempt(Base, UUIDPrimaryKeyMixin):
    """Every sign-in attempt, successful or not.

    Keyed by email rather than user id so attempts against a non-existent
    address are still counted — otherwise the endpoint leaks which addresses
    are registered.
    """

    __tablename__ = "login_attempts"

    email: Mapped[str] = str_col(320)
    user_id: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
    ip_address: Mapped[str] = str_col(45)
    user_agent: Mapped[str | None] = text_col()
    successful: Mapped[bool] = bool_col()
    failure_reason: Mapped[str | None] = str_col(50, nullable=True)
    attempted_at: Mapped[datetime] = ts_col(nullable=False)


class AccountLockout(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "account_lockouts"

    email: Mapped[str] = str_col(320, unique=True)
    user_id: Mapped[uuid.UUID | None] = fk("users.id", nullable=True)
    failed_count: Mapped[int] = int_col(default=0)
    locked_until: Mapped[datetime | None] = ts_col()
    lock_reason: Mapped[str | None] = str_col(100, nullable=True)
    last_failure_at: Mapped[datetime | None] = ts_col()
    unlocked_by: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
    unlocked_at: Mapped[datetime | None] = ts_col()


class PasswordHistory(Base, UUIDPrimaryKeyMixin):
    """Hashes of superseded passwords, for the reuse check. Never plaintext."""

    __tablename__ = "password_history"

    user_id: Mapped[uuid.UUID] = fk("users.id")
    password_hash: Mapped[str] = text_col(nullable=False)
    changed_at: Mapped[datetime] = ts_col(nullable=False)
    changed_by_ip: Mapped[str | None] = str_col(45, nullable=True)


class UserDevice(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "user_devices"

    user_id: Mapped[uuid.UUID] = fk("users.id")
    fingerprint: Mapped[str] = str_col(64)
    display_name: Mapped[str | None] = str_col(150, nullable=True)
    device_type: Mapped[str | None] = str_col(30, nullable=True)
    browser: Mapped[str | None] = str_col(60, nullable=True)
    operating_system: Mapped[str | None] = str_col(60, nullable=True)
    ip_address: Mapped[str | None] = str_col(45, nullable=True)
    last_seen_at: Mapped[datetime] = ts_col(nullable=False)
    first_seen_at: Mapped[datetime] = ts_col(nullable=False)
    is_trusted: Mapped[bool] = bool_col()
    trusted_at: Mapped[datetime | None] = ts_col()
    revoked_at: Mapped[datetime | None] = ts_col()


class UserMfaFactor(Base, UUIDPrimaryKeyMixin):
    """Mirror of a Supabase MFA factor, so policy can be enforced locally."""

    __tablename__ = "user_mfa_factors"

    user_id: Mapped[uuid.UUID] = fk("users.id")
    factor_id: Mapped[str] = str_col(100)
    factor_type: Mapped[str] = str_col(20, default="totp")
    friendly_name: Mapped[str | None] = str_col(100, nullable=True)
    status: Mapped[str] = str_col(20, default="unverified")
    verified_at: Mapped[datetime | None] = ts_col()
    last_used_at: Mapped[datetime | None] = ts_col()
    created_at: Mapped[datetime] = created_ts()


class SecurityEvent(Base, UUIDPrimaryKeyMixin):
    """Append-only forensic trail. Never updated or deleted by the application."""

    __tablename__ = "security_events"

    user_id: Mapped[uuid.UUID | None] = fk("users.id", ondelete="SET NULL", nullable=True)
    email: Mapped[str | None] = str_col(320, nullable=True)
    event_type: Mapped[str] = str_col(50)
    severity: Mapped[str] = str_col(20, default="info")
    ip_address: Mapped[str | None] = str_col(45, nullable=True)
    user_agent: Mapped[str | None] = text_col()
    event_metadata: Mapped[dict] = json_col(default=dict, name="metadata")
    created_at: Mapped[datetime] = created_ts()


class StepUpChallenge(Base, UUIDPrimaryKeyMixin):
    """Short-lived code confirming a high-value action. Only the hash is kept."""

    __tablename__ = "step_up_challenges"

    user_id: Mapped[uuid.UUID] = fk("users.id")
    code_hash: Mapped[str] = str_col(64)
    purpose: Mapped[str] = str_col(50)
    reference_id: Mapped[uuid.UUID | None] = uuid_col(nullable=True)
    attempts: Mapped[int] = int_col(default=0)
    max_attempts: Mapped[int] = int_col(default=3)
    expires_at: Mapped[datetime] = ts_col(nullable=False)
    consumed_at: Mapped[datetime | None] = ts_col()
    created_at: Mapped[datetime] = created_ts()
    ip_address: Mapped[str | None] = str_col(45, nullable=True)
