"""Contract and authorization tests for the identity endpoints.

These deliberately exercise only the paths that resolve before the database is
touched, so they run without a live Postgres.
"""

from __future__ import annotations

import pytest

from app.core.config import settings

EXPECTED_ROUTES = [
    ("/api/v1/auth/session", {"POST", "GET", "DELETE"}),
    ("/api/v1/auth/me", {"GET", "PATCH"}),
    ("/api/v1/users", {"GET"}),
    ("/api/v1/users/{item_id}", {"GET", "PATCH", "DELETE"}),
    ("/api/v1/branches", {"GET", "POST"}),
    ("/api/v1/branches/{item_id}", {"GET", "PATCH", "DELETE"}),
    ("/api/v1/employees", {"GET", "POST"}),
    ("/api/v1/employees/{employee_id}/branch-access", {"GET", "POST"}),
]


class TestRouteRegistration:
    @pytest.mark.parametrize(("path", "methods"), EXPECTED_ROUTES)
    def test_route_exposed(self, client, path, methods):
        # One path may be served by several route objects, one per method.
        registered: dict[str, set[str]] = {}
        for route in client.app.routes:
            if hasattr(route, "methods"):
                registered.setdefault(route.path, set()).update(route.methods)
        assert path in registered, f"{path} not registered"
        assert methods <= registered[path], f"missing {methods - registered[path]}"

    def test_users_has_no_create_endpoint(self, client):
        """Users originate in Supabase Auth; a POST here would orphan the profile."""
        assert client.post("/api/v1/users", json={}).status_code == 405


class TestAuthenticationRequired:
    @pytest.mark.parametrize(
        "path",
        ["/api/v1/users", "/api/v1/branches", "/api/v1/employees", "/api/v1/auth/me", "/api/v1/auth/session"],
    )
    def test_anonymous_rejected(self, client, path):
        r = client.get(path)
        assert r.status_code == 401
        assert r.json()["error"]["code"] == "UNAUTHENTICATED"

    def test_garbage_token_rejected(self, client):
        r = client.get("/api/v1/users", headers={"Authorization": "Bearer not-a-jwt"})
        assert r.status_code == 401
        assert r.json()["error"]["code"] == "INVALID_TOKEN"

    def test_expired_token_reports_expiry(self, client, make_token):
        r = client.get(
            "/api/v1/users", headers={"Authorization": f"Bearer {make_token('super_admin', expires_in=-5)}"}
        )
        assert r.status_code == 401
        assert r.json()["error"]["code"] == "TOKEN_EXPIRED"


class TestPermissionEnforcement:
    def test_content_manager_cannot_list_users(self, client, make_token):
        r = client.get("/api/v1/users", headers={"Authorization": f"Bearer {make_token('content_manager')}"})
        assert r.status_code == 403
        body = r.json()
        assert body["error"]["code"] == "FORBIDDEN"
        assert body["error"]["details"]["required_permission"] == "users:read"

    def test_client_cannot_list_employees(self, client, make_token):
        r = client.get("/api/v1/employees", headers={"Authorization": f"Bearer {make_token('client')}"})
        assert r.status_code == 403

    def test_client_cannot_create_branch(self, client, make_token):
        r = client.post(
            "/api/v1/branches",
            headers={"Authorization": f"Bearer {make_token('client')}"},
            json={
                "name": "Rogue", "code": "RGE", "address": "somewhere",
                "email": "a@b.com", "phone": "+911234567890",
            },
        )
        assert r.status_code == 403


class TestCsrfProtection:
    """Cookie-authenticated mutations require the double-submit header."""

    def test_cookie_mutation_without_csrf_rejected(self, client, make_token):
        client.cookies.clear()
        r = client.post(
            "/api/v1/branches",
            cookies={settings.access_token_cookie: make_token("super_admin")},
            json={"name": "X", "code": "XXX", "address": "a", "email": "a@b.com", "phone": "+911234567890"},
        )
        client.cookies.clear()
        assert r.status_code == 403
        assert r.json()["error"]["code"] == "CSRF_FAILED"

    def test_cookie_read_does_not_require_csrf(self, client, make_token):
        client.cookies.clear()
        r = client.get("/api/v1/auth/session", cookies={settings.access_token_cookie: make_token("audit_manager")})
        client.cookies.clear()
        assert r.status_code == 200

    def test_bearer_mutation_exempt_from_csrf(self, client, make_token):
        """A bearer token is not attached automatically by the browser, so the
        double-submit check does not apply. This must fail past CSRF."""
        r = client.post(
            "/api/v1/branches",
            headers={"Authorization": f"Bearer {make_token('client')}"},
            json={"name": "X", "code": "XXX", "address": "a", "email": "a@b.com", "phone": "+911234567890"},
        )
        assert r.json()["error"]["code"] != "CSRF_FAILED"


class TestSessionEndpoint:
    def test_session_returns_role_and_permissions(self, client, make_token):
        r = client.get(
            "/api/v1/auth/session",
            headers={"Authorization": f"Bearer {make_token('gst_consultant')}"},
        )
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["role"] == "gst_consultant"
        assert data["is_staff"] is True and data["is_admin"] is False
        assert "gst:update" in data["permissions"]
        assert "payroll:update" not in data["permissions"]

    def test_admin_session_reports_admin(self, client, make_token):
        r = client.get(
            "/api/v1/auth/session", headers={"Authorization": f"Bearer {make_token('managing_partner')}"}
        )
        assert r.json()["data"]["is_admin"] is True


class TestValidation:
    def test_invalid_branch_payload_returns_field_errors(self, client, make_token):
        r = client.post(
            "/api/v1/branches",
            headers={"Authorization": f"Bearer {make_token('super_admin')}"},
            json={"name": "", "code": "X", "address": "", "email": "not-an-email", "phone": "abc"},
        )
        assert r.status_code == 422
        body = r.json()
        assert body["error"]["code"] == "VALIDATION_ERROR"
        assert {d["field"] for d in body["error"]["details"]} >= {"name", "code", "email", "phone"}

    def test_unknown_field_rejected(self, client, make_token):
        """Schemas forbid extra keys so a typo cannot silently no-op."""
        r = client.post(
            "/api/v1/branches",
            headers={"Authorization": f"Bearer {make_token('super_admin')}"},
            json={
                "name": "Valid", "code": "VLD", "address": "a", "email": "a@b.com",
                "phone": "+911234567890", "is_admin": True,
            },
        )
        assert r.status_code == 422

    def test_pagination_bounds_enforced(self, client, make_token):
        headers = {"Authorization": f"Bearer {make_token('super_admin')}"}
        assert client.get("/api/v1/branches?page=0", headers=headers).status_code == 422
        assert client.get("/api/v1/branches?page_size=5000", headers=headers).status_code == 422
