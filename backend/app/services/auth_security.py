"""Authentication policy: lockout, password rules, devices, MFA, step-up.

Supabase Auth performs the cryptography. This module decides *whether* an
authentication should be permitted and records what happened, which is the part
Supabase deliberately leaves to the application.

Every threshold is read from ``app_settings`` so security posture can be tuned
without a deployment.
"""

from __future__ import annotations

import hashlib
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    AccountLockedError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.core.logging import get_logger
from app.core.security import hash_password, verify_password
from app.models.identity import User, UserSession
from app.models.security import (
    AccountLockout,
    LoginAttempt,
    PasswordHistory,
    SecurityEvent,
    StepUpChallenge,
    UserDevice,
    UserMfaFactor,
)
from app.repositories.system import AppSettingRepository

logger = get_logger(__name__)

#: Rejected outright — these appear at the top of every breach corpus.
COMMON_PASSWORDS = frozenset({
    "password", "password1", "password123", "123456", "12345678", "123456789",
    "qwerty", "qwerty123", "abc123", "letmein", "welcome", "monkey", "dragon",
    "admin", "admin123", "root", "toor", "pass", "test", "guest", "changeme",
    "iloveyou", "sunshine", "princess", "football", "baseball", "master",
    "finovara", "finovara123", "india123", "welcome123",
})

DEFAULTS: dict[str, Any] = {
    "auth.max_failed_attempts": 5,
    "auth.lockout_minutes": 15,
    "auth.attempt_window_minutes": 15,
    "auth.password_min_length": 12,
    "auth.password_history_depth": 5,
    "auth.password_max_age_days": 180,
    "auth.mfa_required_roles": ["super_admin", "managing_partner", "accounts_admin"],
    "auth.step_up_ttl_seconds": 300,
    "auth.step_up_actions": ["refund.approve", "invoice.void", "payroll.mark_paid", "credit_note.issue"],
    "auth.trusted_device_days": 30,
}


@dataclass(slots=True)
class RequestContext:
    """Where a request came from, for forensics and device recognition."""

    ip_address: str = "unknown"
    user_agent: str | None = None
    fingerprint: str | None = None


class AuthPolicyService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self._settings = AppSettingRepository(session)

    async def setting(self, key: str) -> Any:
        value = await self._settings.get_value(key)
        return DEFAULTS[key] if value is None else value

    # --- Audit ---------------------------------------------------------------

    async def record_event(
        self, event_type: str, *, user_id: UUID | None = None, email: str | None = None,
        severity: str = "info", context: RequestContext | None = None, **metadata: Any,
    ) -> None:
        self.session.add(
            SecurityEvent(
                user_id=user_id, email=email, event_type=event_type, severity=severity,
                ip_address=(context.ip_address if context else None),
                user_agent=(context.user_agent if context else None),
                event_metadata=metadata,
                created_at=datetime.now(timezone.utc),
            )
        )
        await self.session.flush()
        if severity in ("warning", "critical"):
            # 'event' is structlog's reserved key for the message itself.
            logger.warning(
                "security_event", event_type=event_type, email=email, severity=severity, **metadata
            )

    # --- Brute force ---------------------------------------------------------

    async def assert_not_locked(self, email: str) -> None:
        """Raise if the account is locked. Called before any credential check."""
        lockout = (
            await self.session.execute(
                select(AccountLockout).where(AccountLockout.email == email.lower())
            )
        ).scalars().first()

        if lockout is None or lockout.locked_until is None:
            return

        now = datetime.now(timezone.utc)
        if lockout.locked_until > now:
            remaining = int((lockout.locked_until - now).total_seconds() // 60) + 1
            raise AccountLockedError(
                f"This account is locked for another {remaining} minute(s) after repeated failed sign-ins."
            )

        # The lock has aged out; reset so the next attempt starts clean.
        lockout.locked_until = None
        lockout.failed_count = 0
        await self.session.flush()

    async def record_attempt(
        self, email: str, *, successful: bool, context: RequestContext,
        user_id: UUID | None = None, reason: str | None = None,
    ) -> None:
        email = email.lower()
        now = datetime.now(timezone.utc)

        self.session.add(
            LoginAttempt(
                email=email, user_id=user_id, ip_address=context.ip_address,
                user_agent=context.user_agent, successful=successful,
                failure_reason=reason, attempted_at=now,
            )
        )

        lockout = (
            await self.session.execute(
                select(AccountLockout).where(AccountLockout.email == email)
            )
        ).scalars().first()

        if successful:
            if lockout is not None:
                lockout.failed_count = 0
                lockout.locked_until = None
            await self.session.flush()
            await self.record_event("login.success", user_id=user_id, email=email, context=context)
            return

        max_attempts = int(await self.setting("auth.max_failed_attempts"))
        window = int(await self.setting("auth.attempt_window_minutes"))
        lock_minutes = int(await self.setting("auth.lockout_minutes"))

        # Count only recent failures, so an old failure years ago cannot
        # combine with today's to lock someone out.
        recent_failures = await self.session.scalar(
            select(func.count()).select_from(LoginAttempt).where(
                LoginAttempt.email == email,
                LoginAttempt.successful.is_(False),
                LoginAttempt.attempted_at >= now - timedelta(minutes=window),
            )
        )
        failures = int(recent_failures or 0)

        if lockout is None:
            lockout = AccountLockout(email=email, user_id=user_id, failed_count=failures)
            self.session.add(lockout)
        else:
            lockout.failed_count = failures
            lockout.user_id = lockout.user_id or user_id

        lockout.last_failure_at = now

        if failures >= max_attempts:
            lockout.locked_until = now + timedelta(minutes=lock_minutes)
            lockout.lock_reason = f"{failures} failed sign-in attempts"
            await self.session.flush()
            await self.record_event(
                "account.locked", user_id=user_id, email=email, severity="critical",
                context=context, failed_count=failures, locked_minutes=lock_minutes,
            )
            raise AccountLockedError(
                f"Too many failed attempts. This account is locked for {lock_minutes} minutes."
            )

        await self.session.flush()
        await self.record_event(
            "login.failed", user_id=user_id, email=email, severity="warning",
            context=context, reason=reason, attempt=failures, remaining=max_attempts - failures,
        )

    async def unlock(self, email: str, actor_id: UUID, context: RequestContext) -> None:
        lockout = (
            await self.session.execute(
                select(AccountLockout).where(AccountLockout.email == email.lower())
            )
        ).scalars().first()
        if lockout is None:
            raise NotFoundError("Lockout record", email)

        lockout.locked_until = None
        lockout.failed_count = 0
        lockout.unlocked_by = actor_id
        lockout.unlocked_at = datetime.now(timezone.utc)
        await self.session.flush()
        await self.record_event(
            "account.unlocked", email=email.lower(), severity="warning",
            context=context, unlocked_by=str(actor_id),
        )

    # --- Password policy -----------------------------------------------------

    async def validate_password(self, password: str, *, email: str = "", user_id: UUID | None = None) -> None:
        """Enforce strength and non-reuse. Raises ValidationError with all faults."""
        min_length = int(await self.setting("auth.password_min_length"))
        problems: list[str] = []

        if len(password) < min_length:
            problems.append(f"be at least {min_length} characters")
        if not re.search(r"[A-Z]", password):
            problems.append("contain an uppercase letter")
        if not re.search(r"[a-z]", password):
            problems.append("contain a lowercase letter")
        if not re.search(r"\d", password):
            problems.append("contain a digit")
        if not re.search(r"[^A-Za-z0-9]", password):
            problems.append("contain a symbol")
        if password.lower() in COMMON_PASSWORDS:
            problems.append("not be a commonly used password")
        if email and email.split("@")[0].lower() in password.lower():
            problems.append("not contain your email address")
        # Three or more identical characters in a row.
        if re.search(r"(.)\1{2,}", password):
            problems.append("not repeat the same character three times in a row")

        if problems:
            raise ValidationError(
                "The password must " + "; ".join(problems) + ".",
                details={"requirements": problems},
            )

        if user_id is not None and await self._is_reused(user_id, password):
            depth = int(await self.setting("auth.password_history_depth"))
            raise ValidationError(f"This password was used recently. Choose one of your last {depth} passwords ago or newer.")

    async def _is_reused(self, user_id: UUID, password: str) -> bool:
        depth = int(await self.setting("auth.password_history_depth"))
        rows = (
            await self.session.execute(
                select(PasswordHistory.password_hash)
                .where(PasswordHistory.user_id == user_id)
                .order_by(PasswordHistory.changed_at.desc())
                .limit(depth)
            )
        ).scalars().all()
        return any(verify_password(password, stored) for stored in rows)

    async def remember_password(self, user_id: UUID, password: str, context: RequestContext) -> None:
        """Store a hash of a password being set, for future reuse checks."""
        self.session.add(
            PasswordHistory(
                user_id=user_id,
                password_hash=hash_password(password),
                changed_at=datetime.now(timezone.utc),
                changed_by_ip=context.ip_address,
            )
        )

        # Keep the history bounded; older entries have no policy value.
        depth = int(await self.setting("auth.password_history_depth"))
        stale = (
            await self.session.execute(
                select(PasswordHistory)
                .where(PasswordHistory.user_id == user_id)
                .order_by(PasswordHistory.changed_at.desc())
                .offset(depth + 1)
            )
        ).scalars().all()
        for row in stale:
            await self.session.delete(row)
        await self.session.flush()

    # --- Devices -------------------------------------------------------------

    @staticmethod
    def fingerprint(context: RequestContext) -> str:
        """Stable, non-identifying device hash from the request signature."""
        if context.fingerprint:
            return hashlib.sha256(context.fingerprint.encode()).hexdigest()
        basis = f"{context.user_agent or ''}|{context.ip_address}"
        return hashlib.sha256(basis.encode()).hexdigest()

    async def register_device(self, user_id: UUID, context: RequestContext) -> tuple[UserDevice, bool]:
        """Upsert the calling device. Returns (device, is_new)."""
        digest = self.fingerprint(context)
        now = datetime.now(timezone.utc)

        device = (
            await self.session.execute(
                select(UserDevice).where(
                    UserDevice.user_id == user_id, UserDevice.fingerprint == digest
                )
            )
        ).scalars().first()

        if device is not None:
            device.last_seen_at = now
            device.ip_address = context.ip_address
            device.revoked_at = None
            await self.session.flush()
            return device, False

        agent = context.user_agent or ""
        device = UserDevice(
            user_id=user_id, fingerprint=digest,
            display_name=_describe_device(agent),
            device_type="mobile" if re.search(r"Mobi|Android|iPhone", agent, re.I) else "desktop",
            browser=_browser_of(agent), operating_system=_os_of(agent),
            ip_address=context.ip_address, last_seen_at=now, first_seen_at=now,
            is_trusted=False,
        )
        self.session.add(device)
        await self.session.flush()

        await self.record_event(
            "device.new", user_id=user_id, severity="warning", context=context,
            device=device.display_name,
        )
        return device, True

    async def list_devices(self, user_id: UUID) -> list[UserDevice]:
        return list(
            (
                await self.session.execute(
                    select(UserDevice)
                    .where(UserDevice.user_id == user_id, UserDevice.revoked_at.is_(None))
                    .order_by(UserDevice.last_seen_at.desc())
                )
            ).scalars().all()
        )

    async def revoke_device(self, user_id: UUID, device_id: UUID, context: RequestContext) -> None:
        device = await self.session.get(UserDevice, device_id)
        if device is None or device.user_id != user_id:
            raise NotFoundError("Device", device_id)

        device.revoked_at = datetime.now(timezone.utc)
        device.is_trusted = False

        # Revoking a device must also kill its sessions, or the token keeps working.
        sessions = (
            await self.session.execute(
                select(UserSession).where(
                    UserSession.user_id == user_id,
                    UserSession.device_id == device_id,
                    UserSession.revoked_at.is_(None),
                )
            )
        ).scalars().all()
        for row in sessions:
            row.revoked_at = datetime.now(timezone.utc)
            row.revoked_reason = "device_revoked"

        await self.session.flush()
        await self.record_event(
            "device.revoked", user_id=user_id, severity="warning", context=context,
            device_id=str(device_id), sessions_revoked=len(sessions),
        )

    # --- MFA -----------------------------------------------------------------

    async def mfa_required_for(self, role_code: str) -> bool:
        required = await self.setting("auth.mfa_required_roles")
        return role_code in (required or [])

    async def active_factors(self, user_id: UUID) -> list[UserMfaFactor]:
        return list(
            (
                await self.session.execute(
                    select(UserMfaFactor).where(
                        UserMfaFactor.user_id == user_id, UserMfaFactor.status == "verified"
                    )
                )
            ).scalars().all()
        )

    async def has_mfa(self, user_id: UUID) -> bool:
        return bool(await self.active_factors(user_id))

    async def record_factor(self, user_id: UUID, factor_id: str, friendly_name: str | None) -> UserMfaFactor:
        existing = (
            await self.session.execute(
                select(UserMfaFactor).where(
                    UserMfaFactor.user_id == user_id, UserMfaFactor.factor_id == factor_id
                )
            )
        ).scalars().first()
        if existing is not None:
            return existing

        factor = UserMfaFactor(
            user_id=user_id, factor_id=factor_id, factor_type="totp",
            friendly_name=friendly_name or "Authenticator app",
            status="unverified", created_at=datetime.now(timezone.utc),
        )
        self.session.add(factor)
        await self.session.flush()
        return factor

    async def confirm_factor(self, user_id: UUID, factor_id: str, context: RequestContext) -> None:
        factor = (
            await self.session.execute(
                select(UserMfaFactor).where(
                    UserMfaFactor.user_id == user_id, UserMfaFactor.factor_id == factor_id
                )
            )
        ).scalars().first()
        if factor is None:
            raise NotFoundError("MFA factor", factor_id)

        factor.status = "verified"
        factor.verified_at = datetime.now(timezone.utc)
        factor.last_used_at = factor.verified_at
        await self.session.flush()
        await self.record_event("mfa.enrolled", user_id=user_id, context=context, factor_id=factor_id)

    async def revoke_factor(self, user_id: UUID, factor_id: str, context: RequestContext) -> None:
        factor = (
            await self.session.execute(
                select(UserMfaFactor).where(
                    UserMfaFactor.user_id == user_id, UserMfaFactor.factor_id == factor_id
                )
            )
        ).scalars().first()
        if factor is None:
            raise NotFoundError("MFA factor", factor_id)

        factor.status = "revoked"
        await self.session.flush()
        await self.record_event(
            "mfa.revoked", user_id=user_id, severity="warning", context=context, factor_id=factor_id
        )

    # --- Step-up verification -------------------------------------------------

    async def issue_step_up(
        self, user_id: UUID, purpose: str, context: RequestContext, reference_id: UUID | None = None
    ) -> str:
        """Create a one-time code for a high-value action. Returns the plaintext
        code, which the caller delivers out of band — it is never stored."""
        allowed = await self.setting("auth.step_up_actions")
        if purpose not in (allowed or []):
            raise ValidationError(f"'{purpose}' does not require step-up verification.")

        ttl = int(await self.setting("auth.step_up_ttl_seconds"))
        code = f"{secrets.randbelow(1_000_000):06d}"

        self.session.add(
            StepUpChallenge(
                user_id=user_id,
                code_hash=hashlib.sha256(code.encode()).hexdigest(),
                purpose=purpose, reference_id=reference_id,
                expires_at=datetime.now(timezone.utc) + timedelta(seconds=ttl),
                created_at=datetime.now(timezone.utc),
                ip_address=context.ip_address,
            )
        )
        await self.session.flush()
        await self.record_event("stepup.issued", user_id=user_id, context=context, purpose=purpose)
        return code

    async def verify_step_up(
        self, user_id: UUID, purpose: str, code: str, context: RequestContext
    ) -> None:
        now = datetime.now(timezone.utc)
        challenge = (
            await self.session.execute(
                select(StepUpChallenge)
                .where(
                    StepUpChallenge.user_id == user_id,
                    StepUpChallenge.purpose == purpose,
                    StepUpChallenge.consumed_at.is_(None),
                    StepUpChallenge.expires_at > now,
                )
                .order_by(StepUpChallenge.created_at.desc())
                .limit(1)
            )
        ).scalars().first()

        if challenge is None:
            await self.record_event(
                "stepup.failed", user_id=user_id, severity="warning", context=context,
                purpose=purpose, reason="no_active_challenge",
            )
            raise ForbiddenError("No active verification code. Request a new one.")

        if challenge.attempts >= challenge.max_attempts:
            challenge.consumed_at = now
            await self.session.flush()
            await self.record_event(
                "stepup.exhausted", user_id=user_id, severity="critical", context=context, purpose=purpose
            )
            raise ForbiddenError("Too many incorrect codes. Request a new one.")

        expected = hashlib.sha256(code.encode()).hexdigest()
        if not secrets.compare_digest(expected, challenge.code_hash):
            challenge.attempts += 1
            await self.session.flush()
            await self.record_event(
                "stepup.failed", user_id=user_id, severity="warning", context=context,
                purpose=purpose, attempt=challenge.attempts,
            )
            raise ForbiddenError(
                f"Incorrect code. {challenge.max_attempts - challenge.attempts} attempt(s) remaining."
            )

        challenge.consumed_at = now
        await self.session.flush()
        await self.record_event("stepup.verified", user_id=user_id, context=context, purpose=purpose)

    # --- Sessions -------------------------------------------------------------

    async def list_sessions(self, user_id: UUID) -> list[UserSession]:
        return list(
            (
                await self.session.execute(
                    select(UserSession)
                    .where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
                    .order_by(UserSession.last_active_at.desc())
                )
            ).scalars().all()
        )

    async def revoke_session(self, user_id: UUID, session_id: UUID, context: RequestContext) -> None:
        row = await self.session.get(UserSession, session_id)
        if row is None or row.user_id != user_id:
            raise NotFoundError("Session", session_id)
        row.revoked_at = datetime.now(timezone.utc)
        row.revoked_reason = "user_revoked"
        await self.session.flush()
        await self.record_event("session.revoked", user_id=user_id, context=context,
                                session_id=str(session_id))

    async def revoke_all_sessions(
        self, user_id: UUID, context: RequestContext, *, reason: str = "user_logout_all",
        except_session: UUID | None = None,
    ) -> int:
        rows = (
            await self.session.execute(
                select(UserSession).where(
                    UserSession.user_id == user_id, UserSession.revoked_at.is_(None)
                )
            )
        ).scalars().all()

        now = datetime.now(timezone.utc)
        revoked = 0
        for row in rows:
            if except_session and row.id == except_session:
                continue
            row.revoked_at = now
            row.revoked_reason = reason
            revoked += 1

        await self.session.flush()
        await self.record_event(
            "session.revoked_all", user_id=user_id, severity="warning",
            context=context, count=revoked, reason=reason,
        )
        return revoked

    async def revoke_family(self, family_id: UUID, context: RequestContext) -> int:
        """Kill an entire refresh-token family.

        Called when an already-rotated refresh token is replayed, which means
        the token was captured. Every descendant must die, not just the replay.
        """
        rows = (
            await self.session.execute(
                select(UserSession).where(
                    UserSession.family_id == family_id, UserSession.revoked_at.is_(None)
                )
            )
        ).scalars().all()

        now = datetime.now(timezone.utc)
        for row in rows:
            row.revoked_at = now
            row.revoked_reason = "token_reuse_detected"

        await self.session.flush()
        if rows:
            await self.record_event(
                "session.reuse_detected", user_id=rows[0].user_id, severity="critical",
                context=context, family_id=str(family_id), revoked=len(rows),
            )
        return len(rows)


# --- Supabase Auth admin operations -----------------------------------------


class SupabaseAuthAdmin:
    """Thin wrapper over the Supabase Auth REST API.

    Password reset, OTP and MFA are performed by Supabase; this class exists so
    the endpoints do not each hand-roll HTTP calls and key handling.
    """

    def __init__(self) -> None:
        self.base = settings.supabase_url.rstrip("/")
        self.anon = settings.supabase_anon_key
        self.service = settings.supabase_service_role_key

    def _headers(self, key: str, token: str | None = None) -> dict[str, str]:
        return {
            "apikey": key,
            "Authorization": f"Bearer {token or key}",
            "Content-Type": "application/json",
        }

    async def _post(self, path: str, key: str, payload: dict, token: str | None = None) -> httpx.Response:
        if not self.base or not key:
            raise ConflictError("Supabase Auth is not configured.")
        async with httpx.AsyncClient(timeout=30) as client:
            return await client.post(f"{self.base}{path}", headers=self._headers(key, token), json=payload)

    async def send_otp(self, email: str) -> None:
        """Email a one-time sign-in code."""
        response = await self._post("/auth/v1/otp", self.anon, {"email": email, "create_user": False})
        if response.status_code >= 400:
            logger.warning("otp_send_failed", status=response.status_code, body=response.text[:200])

    async def send_password_reset(self, email: str, redirect_to: str | None = None) -> None:
        payload: dict[str, Any] = {"email": email}
        if redirect_to:
            payload["redirect_to"] = redirect_to
        response = await self._post("/auth/v1/recover", self.anon, payload)
        if response.status_code >= 400:
            logger.warning("reset_send_failed", status=response.status_code, body=response.text[:200])

    async def update_password(self, access_token: str, new_password: str) -> bool:
        if not self.base or not self.anon:
            raise ConflictError("Supabase Auth is not configured.")
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.put(
                f"{self.base}/auth/v1/user",
                headers=self._headers(self.anon, access_token),
                json={"password": new_password},
            )
        if response.status_code >= 400:
            raise ValidationError("The password could not be updated. The link may have expired.")
        return True

    async def admin_update_user(self, user_id: UUID, payload: dict) -> bool:
        if not self.base or not self.service:
            raise ConflictError("Supabase service role key is not configured.")
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.put(
                f"{self.base}/auth/v1/admin/users/{user_id}",
                headers=self._headers(self.service), json=payload,
            )
        return response.status_code < 400

    async def sign_out_everywhere(self, user_id: UUID) -> bool:
        """Invalidate every Supabase refresh token for a user."""
        if not self.base or not self.service:
            return False
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.base}/auth/v1/admin/users/{user_id}/logout",
                headers=self._headers(self.service), json={},
            )
        return response.status_code < 400

    async def enroll_totp(self, access_token: str, friendly_name: str) -> dict:
        response = await self._post(
            "/auth/v1/factors", self.anon,
            {"factor_type": "totp", "friendly_name": friendly_name}, token=access_token,
        )
        if response.status_code >= 400:
            raise ConflictError(f"Enrolment failed: {response.text[:200]}")
        return response.json()

    async def challenge_totp(self, access_token: str, factor_id: str) -> dict:
        response = await self._post(
            f"/auth/v1/factors/{factor_id}/challenge", self.anon, {}, token=access_token
        )
        if response.status_code >= 400:
            raise ConflictError("Could not start the MFA challenge.")
        return response.json()

    async def verify_totp(self, access_token: str, factor_id: str, challenge_id: str, code: str) -> dict:
        response = await self._post(
            f"/auth/v1/factors/{factor_id}/verify", self.anon,
            {"challenge_id": challenge_id, "code": code}, token=access_token,
        )
        if response.status_code >= 400:
            raise ForbiddenError("That verification code is not valid.")
        return response.json()


# --- User-agent parsing ------------------------------------------------------


def _browser_of(agent: str) -> str:
    for pattern, name in (
        (r"Edg/", "Edge"), (r"OPR/|Opera", "Opera"), (r"Chrome/", "Chrome"),
        (r"Safari/", "Safari"), (r"Firefox/", "Firefox"),
    ):
        if re.search(pattern, agent):
            return name
    return "Unknown"


def _os_of(agent: str) -> str:
    for pattern, name in (
        (r"Windows NT 10", "Windows"), (r"Windows", "Windows"), (r"Mac OS X", "macOS"),
        (r"Android", "Android"), (r"iPhone|iPad|iOS", "iOS"), (r"Linux", "Linux"),
    ):
        if re.search(pattern, agent, re.I):
            return name
    return "Unknown"


def _describe_device(agent: str) -> str:
    return f"{_browser_of(agent)} on {_os_of(agent)}"


def auth_policy_service(session: AsyncSession) -> AuthPolicyService:
    return AuthPolicyService(session)
