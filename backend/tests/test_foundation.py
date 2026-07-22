"""Phase 2B foundation tests: config, JWT, RBAC, middleware, error envelope."""

from __future__ import annotations

import uuid

import pytest

from app.core.config import Settings
from app.core.exceptions import InvalidTokenError, TokenExpiredError
from app.core.permissions import Action, Module, Role, has_permission, perm, permissions_for
from app.core.security import (
    generate_csrf_token,
    hash_password,
    verify_csrf,
    verify_password,
    verify_token,
)
from app.middleware.rate_limit import parse_rule


class TestHealth:
    def test_liveness_checks_no_dependency(self, client):
        r = client.get("/health/live")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}

    def test_readiness_reports_unavailable_without_database(self, client):
        r = client.get("/health/ready")
        assert r.status_code == 503
        body = r.json()
        assert body["status"] == "unavailable"
        assert body["checks"]["database"] is False


class TestSecurityHeaders:
    @pytest.mark.parametrize(
        ("header", "expected"),
        [
            ("X-Content-Type-Options", "nosniff"),
            ("X-Frame-Options", "DENY"),
            ("Referrer-Policy", "no-referrer"),
            ("Cross-Origin-Opener-Policy", "same-origin"),
            ("Cache-Control", "no-store"),
        ],
    )
    def test_headers_present(self, client, header, expected):
        assert client.get("/health/live").headers[header] == expected

    def test_csp_present(self, client):
        assert "Content-Security-Policy" in client.get("/health/live").headers

    def test_stack_not_advertised(self, client):
        headers = {k.lower() for k in client.get("/health/live").headers}
        assert "server" not in headers and "x-powered-by" not in headers


class TestRequestContext:
    def test_request_id_generated(self, client):
        assert client.get("/health/live").headers.get("X-Request-ID")

    def test_inbound_correlation_id_preserved(self, client):
        rid = "trace-abc-123"
        assert client.get("/health/live", headers={"X-Request-ID": rid}).headers["X-Request-ID"] == rid

    def test_oversized_correlation_id_replaced(self, client):
        r = client.get("/health/live", headers={"X-Request-ID": "x" * 200})
        assert r.headers["X-Request-ID"] != "x" * 200


class TestErrorEnvelope:
    def test_not_found_shape(self, client):
        body = client.get("/api/v1/nope").json()
        assert body["success"] is False
        assert body["error"]["code"] == "NOT_FOUND"
        assert body["request_id"]

    def test_error_body_has_no_stack_trace(self, client):
        assert "Traceback" not in client.get("/api/v1/nope").text


class TestTokenVerification:
    def test_claims_mapped_to_context(self, make_token):
        branch, employee = str(uuid.uuid4()), str(uuid.uuid4())
        ctx = verify_token(make_token("audit_manager", branch_id=branch, employee_id=employee))
        assert ctx.role is Role.AUDIT_MANAGER
        assert str(ctx.branch_id) == branch
        assert str(ctx.employee_id) == employee
        assert ctx.is_staff and not ctx.is_admin

    def test_null_metadata_becomes_none(self, make_token):
        ctx = verify_token(make_token("client", client_id=None, branch_id="null"))
        assert ctx.client_id is None and ctx.branch_id is None

    def test_postgres_role_falls_back_to_application_role(self, make_token):
        # Supabase sets role='authenticated'; the real role lives in user_metadata.
        import jwt as _jwt
        import time as _time

        from tests.conftest import JWT_SECRET

        now = int(_time.time())
        token = _jwt.encode(
            {
                "sub": str(uuid.uuid4()), "aud": "authenticated", "iat": now, "exp": now + 300,
                "role": "authenticated", "user_metadata": {"role": "tax_manager"},
            },
            JWT_SECRET, algorithm="HS256",
        )
        assert verify_token(token).role is Role.TAX_MANAGER

    def test_expired_token_rejected(self, make_token):
        with pytest.raises(TokenExpiredError):
            verify_token(make_token(expires_in=-10))

    def test_forged_signature_rejected(self, make_token):
        with pytest.raises(InvalidTokenError):
            verify_token(make_token(secret="attacker-secret"))

    def test_unknown_role_rejected(self, make_token):
        with pytest.raises(InvalidTokenError):
            verify_token(make_token("root"))

    def test_empty_token_rejected(self):
        with pytest.raises(InvalidTokenError):
            verify_token("")


class TestRBAC:
    def test_super_admin_holds_everything(self):
        assert has_permission(Role.SUPER_ADMIN, perm(Module.PAYROLL, Action.DELETE))
        assert len(permissions_for(Role.SUPER_ADMIN)) == len(list(Module)) * len(list(Action))

    @pytest.mark.parametrize(
        ("role", "permission", "allowed"),
        [
            (Role.CLIENT, perm(Module.INVOICES, Action.READ), True),
            (Role.CLIENT, perm(Module.INVOICES, Action.DELETE), False),
            (Role.CLIENT, perm(Module.CLIENTS, Action.READ), False),
            (Role.GST_CONSULTANT, perm(Module.GST, Action.UPDATE), True),
            (Role.GST_CONSULTANT, perm(Module.PAYROLL, Action.UPDATE), False),
            (Role.PAYROLL_EXECUTIVE, perm(Module.PAYROLL, Action.CREATE), True),
            (Role.PAYROLL_EXECUTIVE, perm(Module.INVOICES, Action.CREATE), False),
            (Role.CONTENT_MANAGER, perm(Module.CMS, Action.UPDATE), True),
            (Role.CONTENT_MANAGER, perm(Module.CLIENTS, Action.READ), False),
            (Role.MANAGING_PARTNER, perm(Module.AUDITS, Action.APPROVE), True),
            (Role.ACCOUNTS_ADMIN, perm(Module.PAYMENTS, Action.CREATE), True),
            (Role.RELATIONSHIP_MANAGER, perm(Module.LEADS, Action.UPDATE), True),
        ],
    )
    def test_matrix(self, role, permission, allowed):
        assert has_permission(role, permission) is allowed

    def test_unknown_role_denied(self):
        assert not has_permission("nonsense", perm(Module.USERS, Action.READ))


class TestCsrf:
    def test_matching_tokens_accepted(self):
        token = generate_csrf_token()
        assert verify_csrf(token, token)

    def test_mismatch_rejected(self):
        assert not verify_csrf(generate_csrf_token(), generate_csrf_token())

    @pytest.mark.parametrize(("cookie", "header"), [(None, "x"), ("x", None), (None, None), ("", "")])
    def test_missing_rejected(self, cookie, header):
        assert not verify_csrf(cookie, header)


class TestPasswordHashing:
    def test_argon2_used(self):
        assert hash_password("Str0ng!Passphrase#2026").startswith("$argon2")

    def test_roundtrip(self):
        h = hash_password("Str0ng!Passphrase#2026")
        assert verify_password("Str0ng!Passphrase#2026", h)
        assert not verify_password("wrong", h)

    def test_salted(self):
        assert hash_password("same") != hash_password("same")


class TestRateLimitRules:
    @pytest.mark.parametrize(
        ("rule", "expected"),
        [("200/minute", (200, 60)), ("10/second", (10, 1)), ("5/hour", (5, 3600)), ("1/day", (1, 86400))],
    )
    def test_parse(self, rule, expected):
        assert parse_rule(rule) == expected

    @pytest.mark.parametrize("rule", ["garbage", "10/fortnight", "", "abc/minute"])
    def test_invalid_rejected(self, rule):
        with pytest.raises(ValueError):
            parse_rule(rule)


class TestProductionGuard:
    BASE = {
        "app_env": "production",
        "debug": False,
        "cookie_secure": True,
        "database_url": "postgresql+asyncpg://u:p@h:5432/d",
        "supabase_url": "https://x.supabase.co",
        "supabase_service_role_key": "svc",
        "supabase_jwt_secret": "sec",
        "cors_origins": ["https://app.finovara.com"],
        "trusted_hosts": ["app.finovara.com"],
    }

    def test_safe_production_config_accepted(self):
        assert Settings(**self.BASE).is_production

    @pytest.mark.parametrize(
        "override",
        [
            {"debug": True},
            {"cookie_secure": False},
            {"cors_origins": ["*"]},
            {"trusted_hosts": ["*"]},
            {"supabase_service_role_key": ""},
            {"supabase_jwt_secret": ""},
        ],
    )
    def test_unsafe_production_config_rejected(self, override):
        with pytest.raises(ValueError, match="Unsafe production configuration"):
            Settings(**{**self.BASE, **override})

    def test_csv_env_parsing(self):
        s = Settings(**{**self.BASE, "app_env": "development", "cors_origins": "http://a.com, http://b.com"})
        assert s.cors_origins == ["http://a.com", "http://b.com"]


class TestDependencyFailureMapping:
    """A dependency being down must read as 503, not as a bug in our code."""

    def test_database_failure_returns_503(self, client, make_token):
        # No database is reachable in the test environment, so any endpoint that
        # queries one exercises the real failure path.
        r = client.get(
            "/api/v1/branches", headers={"Authorization": f"Bearer {make_token('super_admin')}"}
        )
        assert r.status_code == 503
        assert r.json()["error"]["code"] == "DEPENDENCY_UNAVAILABLE"

    def test_failure_response_leaks_no_internals(self, client, make_token):
        r = client.get(
            "/api/v1/branches", headers={"Authorization": f"Bearer {make_token('super_admin')}"}
        )
        body = r.text
        assert "Traceback" not in body and "asyncpg" not in body and "password" not in body
