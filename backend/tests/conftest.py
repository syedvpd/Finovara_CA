"""Test configuration. Environment is set before app modules import."""

from __future__ import annotations

import os

os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/postgres")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_JWT_SECRET", "unit-test-secret-not-a-real-key")
os.environ.setdefault("SUPABASE_JWT_ALGORITHM", "HS256")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
os.environ.setdefault("COOKIE_SECURE", "false")

import time  # noqa: E402
import uuid  # noqa: E402
from typing import Any  # noqa: E402

import jwt  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def make_token():
    def _make(
        role: str = "chartered_accountant",
        *,
        expires_in: int = 900,
        secret: str = JWT_SECRET,
        **metadata: Any,
    ) -> str:
        now = int(time.time())
        claims = {
            "sub": str(uuid.uuid4()),
            "email": "user@finovara.com",
            "aud": "authenticated",
            "iat": now,
            "exp": now + expires_in,
            "role": role,
            "user_metadata": {"role": role, **metadata},
        }
        return jwt.encode(claims, secret, algorithm="HS256")

    return _make
