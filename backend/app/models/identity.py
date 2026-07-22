"""Identity, RBAC, and organisation structure."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy.orm import Mapped, relationship

from app.db.base import (
    created_ts,
    AuditMixin,
    Base,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    bool_col,
    date_col,
    fk,
    json_col,
    str_col,
    text_col,
    ts_col,
    uuid_col,
)


class Role(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "roles"

    name: Mapped[str] = str_col(100, unique=True)
    code: Mapped[str] = str_col(50, unique=True)
    description: Mapped[str | None] = text_col()

    permissions: Mapped[list[Permission]] = relationship(
        secondary="public.role_permissions", back_populates="roles", lazy="selectin"
    )


class Permission(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "permissions"

    name: Mapped[str] = str_col(100, unique=True)
    code: Mapped[str] = str_col(50, unique=True)
    description: Mapped[str | None] = text_col()

    roles: Mapped[list[Role]] = relationship(
        secondary="public.role_permissions", back_populates="permissions", lazy="selectin"
    )


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id: Mapped[uuid.UUID] = fk("roles.id", primary_key=True)
    permission_id: Mapped[uuid.UUID] = fk("permissions.id", primary_key=True)


class User(Base, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """Profile row mirroring ``auth.users``; the PK is the Supabase user id."""

    __tablename__ = "users"

    # PK is the Supabase auth.users id. The FK to auth.users lives in the
    # migration; it is not mapped here because auth is outside this metadata.
    id: Mapped[uuid.UUID] = uuid_col(primary_key=True)
    role_id: Mapped[uuid.UUID | None] = fk("roles.id", ondelete="RESTRICT", nullable=True)
    email: Mapped[str] = str_col(320)
    first_name: Mapped[str] = str_col(100)
    last_name: Mapped[str] = str_col(100)
    phone: Mapped[str | None] = str_col(20, nullable=True)
    avatar_url: Mapped[str | None] = text_col()
    status: Mapped[str] = str_col(20, default="active")

    role: Mapped[Role | None] = relationship(lazy="joined", foreign_keys=[role_id])

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class LoginHistory(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "login_history"

    user_id: Mapped[uuid.UUID | None] = fk("users.id", nullable=True)
    ip_address: Mapped[str] = str_col(45)
    user_agent: Mapped[str | None] = text_col()
    device_info: Mapped[dict | None] = json_col(nullable=True)
    logged_in_at: Mapped[datetime] = created_ts()


class UserSession(Base, UUIDPrimaryKeyMixin):
    """A refresh-token session.

    ``family_id`` groups a token and every token rotated from it. Replaying an
    already-rotated token means it was captured, so the whole family is revoked
    rather than just the replayed one.
    """

    __tablename__ = "user_sessions"

    user_id: Mapped[uuid.UUID | None] = fk("users.id", nullable=True)
    token_hash: Mapped[str] = str_col(255)
    expires_at: Mapped[datetime] = ts_col(nullable=False)
    created_at: Mapped[datetime] = created_ts()
    last_active_at: Mapped[datetime] = created_ts()

    family_id: Mapped[uuid.UUID | None] = uuid_col(nullable=True)
    rotated_from: Mapped[uuid.UUID | None] = uuid_col(nullable=True)
    device_id: Mapped[uuid.UUID | None] = fk("user_devices.id", ondelete="SET NULL", nullable=True)
    ip_address: Mapped[str | None] = str_col(45, nullable=True)
    user_agent: Mapped[str | None] = text_col()
    #: Hard ceiling on session lifetime, regardless of activity.
    absolute_expires_at: Mapped[datetime | None] = ts_col()
    revoked_at: Mapped[datetime | None] = ts_col()
    revoked_reason: Mapped[str | None] = str_col(60, nullable=True)

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None


class Branch(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, AuditMixin):
    __tablename__ = "branches"

    name: Mapped[str] = str_col(100, unique=True)
    code: Mapped[str] = str_col(20, unique=True)
    address: Mapped[str] = text_col(nullable=False)
    email: Mapped[str] = str_col(320)
    phone: Mapped[str] = str_col(20)


class Employee(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, AuditMixin):
    __tablename__ = "employees"

    user_id: Mapped[uuid.UUID] = fk("users.id", unique=True)
    employee_code: Mapped[str] = str_col(30)
    branch_id: Mapped[uuid.UUID] = fk("branches.id", ondelete="RESTRICT")
    designation: Mapped[str] = str_col(100)
    department: Mapped[str] = str_col(100)
    pan: Mapped[str | None] = str_col(10, nullable=True)
    date_of_joining: Mapped[date] = date_col(nullable=False)

    user: Mapped[User] = relationship(lazy="joined", foreign_keys=[user_id])
    branch: Mapped[Branch] = relationship(lazy="joined", foreign_keys=[branch_id])


class EmployeeBranchAccess(Base):
    """Additional branches an employee may operate in beyond their home branch."""

    __tablename__ = "employee_branch_access"

    employee_id: Mapped[uuid.UUID] = fk("employees.id", primary_key=True)
    branch_id: Mapped[uuid.UUID] = fk("branches.id", primary_key=True)
