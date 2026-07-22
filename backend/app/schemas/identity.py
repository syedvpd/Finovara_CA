"""Schemas for users, roles, branches, employees, and the session endpoint."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Annotated

from pydantic import EmailStr, Field, field_validator

from app.schemas.common import APIModel

PAN_PATTERN = r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$"
PHONE_PATTERN = r"^\+?[0-9]{7,15}$"

Name = Annotated[str, Field(min_length=1, max_length=100)]
Phone = Annotated[str, Field(pattern=PHONE_PATTERN)]


# --- Roles -------------------------------------------------------------------


class RoleRead(APIModel):
    id: uuid.UUID
    name: str
    code: str
    description: str | None = None


# --- Users -------------------------------------------------------------------


class UserRead(APIModel):
    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    phone: str | None = None
    avatar_url: str | None = None
    status: str
    role: RoleRead | None = None
    created_at: datetime
    updated_at: datetime


class UserUpdate(APIModel):
    first_name: Name | None = None
    last_name: Name | None = None
    phone: Phone | None = None
    avatar_url: str | None = None


class UserAdminUpdate(UserUpdate):
    """Fields only an administrator may change."""

    role_id: uuid.UUID | None = None
    status: str | None = Field(default=None, pattern="^(active|inactive)$")


class SessionInfo(APIModel):
    """Everything the frontend needs to render a session, in one call."""

    user_id: uuid.UUID
    email: str | None = None
    role: str
    permissions: list[str]
    branch_id: uuid.UUID | None = None
    client_id: uuid.UUID | None = None
    employee_id: uuid.UUID | None = None
    is_staff: bool
    is_admin: bool
    expires_at: datetime | None = None


# --- Branches ----------------------------------------------------------------


class BranchRead(APIModel):
    id: uuid.UUID
    name: str
    code: str
    address: str
    email: str
    phone: str
    created_at: datetime
    updated_at: datetime


class BranchCreate(APIModel):
    name: Name
    code: Annotated[str, Field(min_length=2, max_length=20)]
    address: Annotated[str, Field(min_length=1)]
    email: EmailStr
    phone: Phone

    @field_validator("code")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.upper()


class BranchUpdate(APIModel):
    name: Name | None = None
    address: str | None = None
    email: EmailStr | None = None
    phone: Phone | None = None


# --- Employees ---------------------------------------------------------------


class EmployeeRead(APIModel):
    id: uuid.UUID
    user_id: uuid.UUID
    employee_code: str
    branch_id: uuid.UUID
    designation: str
    department: str
    pan: str | None = None
    date_of_joining: date
    created_at: datetime
    updated_at: datetime
    user: UserRead | None = None
    branch: BranchRead | None = None


class EmployeeCreate(APIModel):
    user_id: uuid.UUID
    branch_id: uuid.UUID
    designation: Name
    department: Name
    pan: Annotated[str, Field(pattern=PAN_PATTERN)] | None = None
    date_of_joining: date

    @field_validator("pan")
    @classmethod
    def _upper(cls, v: str | None) -> str | None:
        return v.upper() if v else v

    @field_validator("date_of_joining")
    @classmethod
    def _not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Date of joining cannot be in the future.")
        return v


class EmployeeUpdate(APIModel):
    branch_id: uuid.UUID | None = None
    designation: Name | None = None
    department: Name | None = None
    pan: Annotated[str, Field(pattern=PAN_PATTERN)] | None = None


class EmployeeBranchAccessGrant(APIModel):
    branch_ids: Annotated[list[uuid.UUID], Field(min_length=1, max_length=20)]
