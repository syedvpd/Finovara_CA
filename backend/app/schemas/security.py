"""Schemas for authentication policy endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any

from pydantic import EmailStr, Field

from app.schemas.common import APIModel

Password = Annotated[str, Field(min_length=12, max_length=128)]
OtpCode = Annotated[str, Field(pattern=r"^\d{6}$")]


# --- OTP ---------------------------------------------------------------------


class OtpRequest(APIModel):
    email: EmailStr


class OtpVerify(APIModel):
    email: EmailStr
    token: Annotated[str, Field(min_length=6, max_length=12)]


# --- Password ----------------------------------------------------------------


class ForgotPasswordRequest(APIModel):
    email: EmailStr
    redirect_to: str | None = None


class ResetPasswordRequest(APIModel):
    """Completes a reset using the recovery token from the emailed link."""

    access_token: Annotated[str, Field(min_length=10)]
    new_password: Password


class ChangePasswordRequest(APIModel):
    current_password: Annotated[str, Field(min_length=1)]
    new_password: Password


class PasswordPolicy(APIModel):
    min_length: int
    requires_uppercase: bool = True
    requires_lowercase: bool = True
    requires_digit: bool = True
    requires_symbol: bool = True
    history_depth: int
    max_age_days: int


# --- MFA ---------------------------------------------------------------------


class MfaEnrollRequest(APIModel):
    friendly_name: Annotated[str, Field(max_length=100)] = "Authenticator app"


class MfaEnrollResponse(APIModel):
    factor_id: str
    qr_code: str | None = None
    secret: str | None = None
    uri: str | None = None


class MfaVerifyRequest(APIModel):
    factor_id: Annotated[str, Field(min_length=1)]
    challenge_id: Annotated[str, Field(min_length=1)]
    code: OtpCode


class MfaChallengeRequest(APIModel):
    factor_id: Annotated[str, Field(min_length=1)]


class MfaChallengeResponse(APIModel):
    challenge_id: str
    expires_at: int | None = None


class MfaFactorRead(APIModel):
    id: uuid.UUID
    factor_id: str
    factor_type: str
    friendly_name: str | None = None
    status: str
    verified_at: datetime | None = None
    last_used_at: datetime | None = None
    created_at: datetime


class MfaStatus(APIModel):
    enrolled: bool
    required: bool
    factors: list[MfaFactorRead] = Field(default_factory=list)


# --- Devices and sessions ----------------------------------------------------


class DeviceRead(APIModel):
    id: uuid.UUID
    display_name: str | None = None
    device_type: str | None = None
    browser: str | None = None
    operating_system: str | None = None
    ip_address: str | None = None
    last_seen_at: datetime
    first_seen_at: datetime
    is_trusted: bool


class SessionRead(APIModel):
    id: uuid.UUID
    ip_address: str | None = None
    user_agent: str | None = None
    device_id: uuid.UUID | None = None
    created_at: datetime
    last_active_at: datetime
    expires_at: datetime


class SecurityEventRead(APIModel):
    id: uuid.UUID
    event_type: str
    severity: str
    ip_address: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict, alias="event_metadata")
    created_at: datetime


# --- Step-up -----------------------------------------------------------------


class StepUpRequest(APIModel):
    purpose: Annotated[str, Field(max_length=50)]
    reference_id: uuid.UUID | None = None


class StepUpVerify(APIModel):
    purpose: Annotated[str, Field(max_length=50)]
    code: OtpCode


# --- Administration ----------------------------------------------------------


class UnlockAccountRequest(APIModel):
    email: EmailStr


class LockoutRead(APIModel):
    email: str
    failed_count: int
    locked_until: datetime | None = None
    lock_reason: str | None = None
    last_failure_at: datetime | None = None
