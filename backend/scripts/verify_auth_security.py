"""Verify the authentication policy layer against the live stack.

Covers brute-force lockout, password strength and reuse, device registry,
session revocation, refresh-token family revocation, MFA policy and step-up
verification. Database changes are rolled back.
"""

from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from migrate import dsn_from_env  # noqa: E402

dsn_from_env()

from sqlalchemy import select, text  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.exceptions import AccountLockedError, ForbiddenError, ValidationError  # noqa: E402
from app.models.identity import UserSession  # noqa: E402
from app.models.security import LoginAttempt, SecurityEvent  # noqa: E402
from app.services.auth_security import AuthPolicyService, RequestContext  # noqa: E402

API = "http://127.0.0.1:8000"
results: list[tuple[str, str, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append(("PASS" if ok else "FAIL", name, detail))


async def main() -> int:
    engine = create_async_engine(
        settings.sqlalchemy_url,
        connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0},
        poolclass=None,
    )
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as session:
        tx = await session.begin()
        try:
            policy = AuthPolicyService(session)
            ctx = RequestContext(ip_address="203.0.113.9", user_agent="Mozilla/5.0 (Windows NT 10.0) Chrome/120")
            email = f"lock-{uuid.uuid4().hex[:8]}@example.com"

            # --- Password policy -------------------------------------------
            for bad, why in [
                ("short1!A", "too short"),
                ("alllowercase123!", "no uppercase"),
                ("ALLUPPERCASE123!", "no lowercase"),
                ("NoDigitsHere!!!!", "no digit"),
                ("NoSymbols12345A", "no symbol"),
                ("Password123!xxx", "common password root"),
                ("Aaaa1111!!!!bbb", "repeated characters"),
            ]:
                try:
                    await policy.validate_password(bad)
                    check(f"password rejected: {why}", False, f"accepted {bad!r}")
                except ValidationError:
                    check(f"password rejected: {why}", True)

            try:
                await policy.validate_password("Tr0ub4dor&Kestrel")
                check("strong password accepted", True)
            except ValidationError as exc:
                check("strong password accepted", False, str(exc)[:80])

            try:
                await policy.validate_password("Xy9#mQ2!vLp4", email="rahul@acme.com")
                check("password not containing email accepted", True)
            except ValidationError as exc:
                check("password not containing email accepted", False, str(exc)[:70])

            try:
                await policy.validate_password("rahulXy9#mQ2!", email="rahul@acme.com")
                check("password containing email rejected", False, "accepted")
            except ValidationError:
                check("password containing email rejected", True)

            # --- Brute force / lockout ---------------------------------------
            max_attempts = int(await policy.setting("auth.max_failed_attempts"))
            locked = False
            for i in range(max_attempts):
                try:
                    await policy.record_attempt(email, successful=False, context=ctx, reason="bad_password")
                except AccountLockedError:
                    locked = True
                    check("account locks at threshold", i + 1 == max_attempts, f"locked on attempt {i+1}")
            if not locked:
                check("account locks at threshold", False, f"never locked after {max_attempts}")

            try:
                await policy.assert_not_locked(email)
                check("locked account is refused", False, "not refused")
            except AccountLockedError:
                check("locked account is refused", True)

            attempts = await session.scalar(
                select(text("count(*)")).select_from(LoginAttempt).where(LoginAttempt.email == email)
            )
            check("failed attempts recorded", int(attempts or 0) == max_attempts, f"{attempts} rows")

            events = (
                await session.execute(
                    select(SecurityEvent.event_type).where(SecurityEvent.email == email)
                )
            ).scalars().all()
            check("lock raises critical event", "account.locked" in events, str(sorted(set(events))))

            # Admin unlock clears it.
            admin_id = await session.scalar(
                text("select id from public.users where email = 'admin@finovara.demo'")
            )
            await policy.unlock(email, admin_id, ctx)
            try:
                await policy.assert_not_locked(email)
                check("admin unlock restores access", True)
            except AccountLockedError:
                check("admin unlock restores access", False)

            # --- Devices ------------------------------------------------------
            user_id = admin_id
            device, is_new = await policy.register_device(user_id, ctx)
            check("device registered", device is not None and device.fingerprint, device.display_name or "")
            check("device parsed from user agent",
                  device.browser == "Chrome" and device.operating_system == "Windows",
                  f"{device.browser}/{device.operating_system}")

            same_device, is_new_again = await policy.register_device(user_id, ctx)
            check("same device not duplicated", same_device.id == device.id and not is_new_again)

            other_ctx = RequestContext(ip_address="198.51.100.4",
                                       user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari")
            other_device, other_new = await policy.register_device(user_id, other_ctx)
            check("different device recognised as new",
                  other_device.id != device.id and other_new, other_device.display_name or "")
            check("mobile device classified", other_device.device_type == "mobile", other_device.device_type)

            # --- Sessions and revocation ---------------------------------------
            now = datetime.now(timezone.utc)
            family = uuid.uuid4()
            for _ in range(3):
                session.add(UserSession(
                    user_id=user_id, token_hash=uuid.uuid4().hex, expires_at=now + timedelta(hours=1),
                    created_at=now, last_active_at=now, family_id=family, device_id=device.id,
                    ip_address=ctx.ip_address,
                ))
            await session.flush()

            active = await policy.list_sessions(user_id)
            check("sessions listed", len(active) >= 3, f"{len(active)} active")

            revoked = await policy.revoke_family(family, ctx)
            check("token reuse revokes whole family", revoked >= 3, f"{revoked} revoked")

            reuse_events = (
                await session.execute(
                    select(SecurityEvent.severity).where(SecurityEvent.event_type == "session.reuse_detected")
                )
            ).scalars().all()
            check("reuse logged as critical", "critical" in reuse_events, str(reuse_events[:3]))

            # Revoking a device kills its sessions.
            session.add(UserSession(
                user_id=user_id, token_hash=uuid.uuid4().hex, expires_at=now + timedelta(hours=1),
                created_at=now, last_active_at=now, device_id=other_device.id,
            ))
            await session.flush()
            await policy.revoke_device(user_id, other_device.id, ctx)
            remaining = [s for s in await policy.list_sessions(user_id) if s.device_id == other_device.id]
            check("revoking a device ends its sessions", not remaining, f"{len(remaining)} left")

            # --- MFA policy ------------------------------------------------------
            check("MFA required for super_admin", await policy.mfa_required_for("super_admin"))
            check("MFA not required for client", not await policy.mfa_required_for("client"))
            check("no factors before enrolment", not await policy.has_mfa(user_id))

            await policy.record_factor(user_id, "factor-test-1", "Authenticator")
            check("unverified factor does not satisfy MFA", not await policy.has_mfa(user_id))
            await policy.confirm_factor(user_id, "factor-test-1", ctx)
            check("verified factor satisfies MFA", await policy.has_mfa(user_id))

            # --- Step-up ----------------------------------------------------------
            try:
                await policy.issue_step_up(user_id, "not.an.action", ctx)
                check("step-up rejects unlisted action", False, "accepted")
            except ValidationError:
                check("step-up rejects unlisted action", True)

            code = await policy.issue_step_up(user_id, "refund.approve", ctx)
            check("step-up code is 6 digits", code.isdigit() and len(code) == 6, code)

            try:
                await policy.verify_step_up(user_id, "refund.approve", "000000", ctx)
                check("wrong step-up code rejected", False, "accepted")
            except ForbiddenError:
                check("wrong step-up code rejected", True)

            await policy.verify_step_up(user_id, "refund.approve", code, ctx)
            check("correct step-up code accepted", True)

            try:
                await policy.verify_step_up(user_id, "refund.approve", code, ctx)
                check("step-up code is single-use", False, "reused")
            except ForbiddenError:
                check("step-up code is single-use", True)

            return 0
        finally:
            await tx.rollback()
            await engine.dispose()


async def api_checks() -> None:
    """Endpoint-level checks that need no database mutation."""
    async with httpx.AsyncClient(timeout=30) as http:
        r = await http.get(f"{API}/api/v1/auth/password/policy")
        check("password policy endpoint", r.status_code == 200, f"HTTP {r.status_code}")
        if r.status_code == 200:
            d = r.json()["data"]
            check("policy reports min length", d.get("min_length", 0) >= 12, str(d.get("min_length")))

        # Unauthenticated endpoints must not reveal whether an address exists.
        a = await http.post(f"{API}/api/v1/auth/password/forgot", json={"email": "real@finovara.demo"})
        b = await http.post(f"{API}/api/v1/auth/password/forgot", json={"email": "no-such-user-9f3a2b@finovara.com"})
        check("forgot-password does not enumerate users",
              a.status_code == b.status_code and a.json()["message"] == b.json()["message"],
              f"{a.status_code}/{b.status_code}")

        c = await http.post(f"{API}/api/v1/auth/otp/request", json={"email": "no-such-user-9f3a2b@finovara.com"})
        check("otp request is uniform", c.status_code == 200, f"HTTP {c.status_code}")

        d = await http.get(f"{API}/api/v1/auth/devices")
        check("device list requires auth", d.status_code == 401, f"HTTP {d.status_code}")

        e = await http.get(f"{API}/api/v1/auth/lockouts")
        check("lockout list requires auth", e.status_code == 401, f"HTTP {e.status_code}")


if __name__ == "__main__":
    async def run() -> int:
        code = await main()
        await api_checks()
        return code

    exit_code = asyncio.run(run())
    width = max(len(n) for _, n, _ in results) + 2
    print(f"\n{'RESULT':<7} {'CHECK':<{width}} DETAIL")
    print("-" * (width + 42))
    for status_, name, detail in results:
        print(f"{status_:<7} {name:<{width}} {detail}")
    failed = sum(1 for s, _, _ in results if s == "FAIL")
    print(f"\n{len(results) - failed}/{len(results)} passed. Database changes rolled back.")
    sys.exit(1 if failed else exit_code)
