"""Authentication policy endpoints: OTP, password reset, MFA, devices, step-up.

Supabase performs the cryptography; these endpoints apply the firm's policy
around it and keep the audit trail. Responses to unauthenticated endpoints are
deliberately uniform so they cannot be used to enumerate registered addresses.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Request, status
from sqlalchemy import select

from app.api.deps import AdminUser, CurrentUser, DbSession, invalidate_identity_cache
from app.core.exceptions import ForbiddenError, ValidationError
from app.core.logging import get_logger
from app.models.security import AccountLockout, SecurityEvent
from app.schemas.common import MessageResponse, SuccessResponse
from app.schemas.security import (
    ChangePasswordRequest,
    DeviceRead,
    ForgotPasswordRequest,
    LockoutRead,
    MfaChallengeRequest,
    MfaChallengeResponse,
    MfaEnrollRequest,
    MfaEnrollResponse,
    MfaFactorRead,
    MfaStatus,
    MfaVerifyRequest,
    OtpRequest,
    OtpVerify,
    PasswordPolicy,
    ResetPasswordRequest,
    SecurityEventRead,
    SessionRead,
    StepUpRequest,
    StepUpVerify,
    UnlockAccountRequest,
)
from app.services.auth_security import AuthPolicyService, RequestContext, SupabaseAuthAdmin

logger = get_logger(__name__)
router = APIRouter()


def _rid(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _context(request: Request) -> RequestContext:
    forwarded = request.headers.get("X-Forwarded-For")
    ip = forwarded.split(",")[0].strip() if forwarded else (
        request.client.host if request.client else "unknown"
    )
    return RequestContext(
        ip_address=ip,
        user_agent=request.headers.get("User-Agent"),
        fingerprint=request.headers.get("X-Device-Fingerprint"),
    )


def _bearer(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    cookie = request.cookies.get("fv_access")
    if cookie:
        return cookie
    raise ForbiddenError("This action requires a current access token.")


# --- OTP sign-in --------------------------------------------------------------


@router.post(
    "/otp/request",
    response_model=MessageResponse,
    summary="Email a one-time sign-in code",
    description="Always reports success, whether or not the address is registered — "
    "otherwise the endpoint reveals which emails have accounts.",
)
async def request_otp(request: Request, payload: OtpRequest, session: DbSession) -> MessageResponse:
    policy = AuthPolicyService(session)
    context = _context(request)

    # A locked account must not be able to bypass the lock via OTP.
    await policy.assert_not_locked(payload.email)
    await SupabaseAuthAdmin().send_otp(payload.email)
    await policy.record_event("otp.requested", email=payload.email.lower(), context=context)

    return MessageResponse(
        message="If that address has an account, a sign-in code is on its way.",
        request_id=_rid(request),
    )


@router.post(
    "/otp/verify",
    response_model=MessageResponse,
    summary="Exchange an emailed code for a session",
    description="Verify the code with Supabase from the client, then post the resulting "
    "tokens to /auth/session. This endpoint records the attempt for lockout purposes.",
)
async def verify_otp(request: Request, payload: OtpVerify, session: DbSession) -> MessageResponse:
    policy = AuthPolicyService(session)
    await policy.record_event("otp.verified", email=payload.email.lower(), context=_context(request))
    return MessageResponse(message="Code accepted.", request_id=_rid(request))


# --- Password -----------------------------------------------------------------


@router.get("/password/policy", response_model=SuccessResponse[PasswordPolicy], summary="Password rules")
async def password_policy(request: Request, session: DbSession) -> SuccessResponse[PasswordPolicy]:
    policy = AuthPolicyService(session)
    return SuccessResponse[PasswordPolicy](
        data=PasswordPolicy(
            min_length=int(await policy.setting("auth.password_min_length")),
            history_depth=int(await policy.setting("auth.password_history_depth")),
            max_age_days=int(await policy.setting("auth.password_max_age_days")),
        ),
        request_id=_rid(request),
    )


@router.post(
    "/password/forgot",
    response_model=MessageResponse,
    summary="Send a password reset link",
    description="Uniform response regardless of whether the address exists.",
)
async def forgot_password(
    request: Request, payload: ForgotPasswordRequest, session: DbSession
) -> MessageResponse:
    policy = AuthPolicyService(session)
    await SupabaseAuthAdmin().send_password_reset(payload.email, payload.redirect_to)
    await policy.record_event(
        "password.reset_requested", email=payload.email.lower(), context=_context(request)
    )
    return MessageResponse(
        message="If that address has an account, a reset link is on its way.",
        request_id=_rid(request),
    )


@router.post(
    "/password/reset",
    response_model=MessageResponse,
    summary="Complete a password reset",
    description="Enforces the strength policy and the reuse check before the change is accepted.",
)
async def reset_password(
    request: Request, payload: ResetPasswordRequest, session: DbSession
) -> MessageResponse:
    from app.core.security import verify_token

    context = _context(request)
    # The recovery token identifies the user; verify it before trusting it.
    auth = verify_token(payload.access_token)

    policy = AuthPolicyService(session)
    await policy.validate_password(payload.new_password, email=auth.email or "", user_id=auth.user_id)
    await SupabaseAuthAdmin().update_password(payload.access_token, payload.new_password)
    await policy.remember_password(auth.user_id, payload.new_password, context)

    # A reset usually follows a compromise: end every existing session.
    revoked = await policy.revoke_all_sessions(auth.user_id, context, reason="password_reset")
    await SupabaseAuthAdmin().sign_out_everywhere(auth.user_id)
    await policy.record_event(
        "password.reset", user_id=auth.user_id, severity="warning",
        context=context, sessions_revoked=revoked,
    )

    return MessageResponse(
        message="Your password has been changed. Please sign in again.", request_id=_rid(request)
    )


@router.post("/password/change", response_model=MessageResponse, summary="Change your password")
async def change_password(
    request: Request, payload: ChangePasswordRequest, session: DbSession, auth: CurrentUser
) -> MessageResponse:
    if payload.current_password == payload.new_password:
        raise ValidationError("The new password must differ from the current one.")

    context = _context(request)
    policy = AuthPolicyService(session)

    await policy.validate_password(payload.new_password, email=auth.email or "", user_id=auth.user_id)
    await SupabaseAuthAdmin().update_password(_bearer(request), payload.new_password)
    await policy.remember_password(auth.user_id, payload.new_password, context)

    # Keep the current session; drop the others.
    revoked = await policy.revoke_all_sessions(auth.user_id, context, reason="password_changed")
    await policy.record_event(
        "password.changed", user_id=auth.user_id, severity="warning",
        context=context, other_sessions_revoked=revoked,
    )

    return MessageResponse(
        message="Password changed. Other devices have been signed out.", request_id=_rid(request)
    )


# --- MFA ----------------------------------------------------------------------


@router.get("/mfa/status", response_model=SuccessResponse[MfaStatus], summary="MFA enrolment status")
async def mfa_status(request: Request, session: DbSession, auth: CurrentUser) -> SuccessResponse[MfaStatus]:
    policy = AuthPolicyService(session)
    factors = await policy.active_factors(auth.user_id)
    return SuccessResponse[MfaStatus](
        data=MfaStatus(
            enrolled=bool(factors),
            required=await policy.mfa_required_for(auth.role.value),
            factors=[MfaFactorRead.model_validate(f) for f in factors],
        ),
        request_id=_rid(request),
    )


@router.post(
    "/mfa/enroll",
    response_model=SuccessResponse[MfaEnrollResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Begin TOTP enrolment",
    description="Returns a QR code and secret. The factor stays unverified until a "
    "generated code is confirmed via /mfa/verify.",
)
async def enroll_mfa(
    request: Request, payload: MfaEnrollRequest, session: DbSession, auth: CurrentUser
) -> SuccessResponse[MfaEnrollResponse]:
    result = await SupabaseAuthAdmin().enroll_totp(_bearer(request), payload.friendly_name)
    totp = result.get("totp", {}) or {}

    await AuthPolicyService(session).record_factor(
        auth.user_id, result.get("id", ""), payload.friendly_name
    )

    return SuccessResponse[MfaEnrollResponse](
        data=MfaEnrollResponse(
            factor_id=result.get("id", ""),
            qr_code=totp.get("qr_code"),
            secret=totp.get("secret"),
            uri=totp.get("uri"),
        ),
        request_id=_rid(request),
    )


@router.post(
    "/mfa/challenge",
    response_model=SuccessResponse[MfaChallengeResponse],
    summary="Start an MFA challenge",
)
async def challenge_mfa(
    request: Request, payload: MfaChallengeRequest, session: DbSession, auth: CurrentUser
) -> SuccessResponse[MfaChallengeResponse]:
    result = await SupabaseAuthAdmin().challenge_totp(_bearer(request), payload.factor_id)
    return SuccessResponse[MfaChallengeResponse](
        data=MfaChallengeResponse(challenge_id=result.get("id", ""), expires_at=result.get("expires_at")),
        request_id=_rid(request),
    )


@router.post("/mfa/verify", response_model=MessageResponse, summary="Confirm an MFA code")
async def verify_mfa(
    request: Request, payload: MfaVerifyRequest, session: DbSession, auth: CurrentUser
) -> MessageResponse:
    await SupabaseAuthAdmin().verify_totp(
        _bearer(request), payload.factor_id, payload.challenge_id, payload.code
    )
    await AuthPolicyService(session).confirm_factor(auth.user_id, payload.factor_id, _context(request))
    return MessageResponse(message="Multi-factor authentication is now active.", request_id=_rid(request))


@router.delete("/mfa/{factor_id}", response_model=MessageResponse, summary="Remove an MFA factor")
async def remove_mfa(
    request: Request, factor_id: str, session: DbSession, auth: CurrentUser
) -> MessageResponse:
    policy = AuthPolicyService(session)

    # Roles that must hold MFA cannot drop their last factor.
    if await policy.mfa_required_for(auth.role.value):
        factors = await policy.active_factors(auth.user_id)
        if len([f for f in factors if f.factor_id != factor_id]) == 0:
            raise ForbiddenError("Your role requires multi-factor authentication; enrol another device first.")

    await policy.revoke_factor(auth.user_id, factor_id, _context(request))
    return MessageResponse(message="Factor removed.", request_id=_rid(request))


# --- Devices and sessions ------------------------------------------------------


@router.get("/devices", response_model=SuccessResponse[list[DeviceRead]], summary="Your signed-in devices")
async def list_devices(
    request: Request, session: DbSession, auth: CurrentUser
) -> SuccessResponse[list[DeviceRead]]:
    devices = await AuthPolicyService(session).list_devices(auth.user_id)
    return SuccessResponse[list[DeviceRead]](
        data=[DeviceRead.model_validate(d) for d in devices], request_id=_rid(request)
    )


@router.delete("/devices/{device_id}", response_model=MessageResponse, summary="Revoke a device")
async def revoke_device(
    request: Request, device_id: UUID, session: DbSession, auth: CurrentUser
) -> MessageResponse:
    await AuthPolicyService(session).revoke_device(auth.user_id, device_id, _context(request))
    return MessageResponse(
        message="Device revoked and its sessions ended.", request_id=_rid(request)
    )


@router.get("/sessions", response_model=SuccessResponse[list[SessionRead]], summary="Your active sessions")
async def list_sessions(
    request: Request, session: DbSession, auth: CurrentUser
) -> SuccessResponse[list[SessionRead]]:
    rows = await AuthPolicyService(session).list_sessions(auth.user_id)
    return SuccessResponse[list[SessionRead]](
        data=[SessionRead.model_validate(r) for r in rows], request_id=_rid(request)
    )


@router.delete("/sessions/{session_id}", response_model=MessageResponse, summary="Revoke one session")
async def revoke_session(
    request: Request, session_id: UUID, session: DbSession, auth: CurrentUser
) -> MessageResponse:
    await AuthPolicyService(session).revoke_session(auth.user_id, session_id, _context(request))
    return MessageResponse(message="Session revoked.", request_id=_rid(request))


@router.post(
    "/sessions/revoke-all",
    response_model=MessageResponse,
    summary="Sign out everywhere",
    description="Revokes local sessions and invalidates every Supabase refresh token.",
)
async def revoke_all(request: Request, session: DbSession, auth: CurrentUser) -> MessageResponse:
    context = _context(request)
    count = await AuthPolicyService(session).revoke_all_sessions(auth.user_id, context)
    await SupabaseAuthAdmin().sign_out_everywhere(auth.user_id)
    return MessageResponse(message=f"{count} session(s) revoked.", request_id=_rid(request))


@router.get(
    "/events", response_model=SuccessResponse[list[SecurityEventRead]], summary="Your security activity"
)
async def security_activity(
    request: Request,
    session: DbSession,
    auth: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> SuccessResponse[list[SecurityEventRead]]:
    rows = (
        await session.execute(
            select(SecurityEvent)
            .where(SecurityEvent.user_id == auth.user_id)
            .order_by(SecurityEvent.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return SuccessResponse[list[SecurityEventRead]](
        data=[SecurityEventRead.model_validate(r) for r in rows], request_id=_rid(request)
    )


# --- Step-up verification -------------------------------------------------------


@router.post(
    "/step-up/request",
    response_model=MessageResponse,
    summary="Request a code for a high-value action",
    description="Used before approving a refund, voiding an invoice or releasing payroll.",
)
async def request_step_up(
    request: Request, payload: StepUpRequest, session: DbSession, auth: CurrentUser
) -> MessageResponse:
    from app.models.content import Notification
    from datetime import datetime, timezone

    policy = AuthPolicyService(session)
    code = await policy.issue_step_up(
        auth.user_id, payload.purpose, _context(request), payload.reference_id
    )

    # Delivered through the notification queue, never in the HTTP response.
    session.add(
        Notification(
            recipient_id=auth.user_id, channel="email",
            subject="Your Finovara verification code",
            body=f"Your verification code is {code}. It expires in 5 minutes.\n\n"
                 f"If you did not request this, change your password immediately.",
            status="pending", retry_count=0, created_at=datetime.now(timezone.utc),
        )
    )
    await session.flush()

    return MessageResponse(
        message="A verification code has been sent to your registered email.",
        request_id=_rid(request),
    )


@router.post("/step-up/verify", response_model=MessageResponse, summary="Confirm a step-up code")
async def verify_step_up(
    request: Request, payload: StepUpVerify, session: DbSession, auth: CurrentUser
) -> MessageResponse:
    await AuthPolicyService(session).verify_step_up(
        auth.user_id, payload.purpose, payload.code, _context(request)
    )
    return MessageResponse(message="Verified.", request_id=_rid(request))


# --- Administration --------------------------------------------------------------


@router.get(
    "/lockouts", response_model=SuccessResponse[list[LockoutRead]], summary="Locked accounts (admin)"
)
async def list_lockouts(
    request: Request, session: DbSession, auth: AdminUser
) -> SuccessResponse[list[LockoutRead]]:
    rows = (
        await session.execute(
            select(AccountLockout)
            .where(AccountLockout.locked_until.is_not(None))
            .order_by(AccountLockout.last_failure_at.desc())
        )
    ).scalars().all()
    return SuccessResponse[list[LockoutRead]](
        data=[LockoutRead.model_validate(r) for r in rows], request_id=_rid(request)
    )


@router.post("/lockouts/unlock", response_model=MessageResponse, summary="Unlock an account (admin)")
async def unlock_account(
    request: Request, payload: UnlockAccountRequest, session: DbSession, auth: AdminUser
) -> MessageResponse:
    await AuthPolicyService(session).unlock(payload.email, auth.user_id, _context(request))
    invalidate_identity_cache()
    return MessageResponse(message=f"{payload.email} unlocked.", request_id=_rid(request))
