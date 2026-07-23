"""Application configuration. All values come from the environment."""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, PostgresDsn, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

Environment = Literal["development", "staging", "production"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---------------------------------------------------------
    app_env: Environment = "development"
    app_name: str = "Finovara ERP API"
    api_v1_prefix: str = "/api/v1"
    debug: bool = False
    log_level: str = "INFO"
    log_json: bool = False

    # --- Database ------------------------------------------------------------
    database_url: PostgresDsn
    # Small pool: the Supabase free-tier pooler has a low connection ceiling,
    # and an oversized pool saturates it and trips Supavisor's circuit breaker.
    database_pool_size: int = 5
    database_max_overflow: int = 5
    database_pool_recycle: int = 1800
    database_echo: bool = False
    database_use_pgbouncer: bool = False

    # --- Supabase ------------------------------------------------------------
    supabase_url: str
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    supabase_jwt_algorithm: str = "HS256"
    supabase_jwt_audience: str = "authenticated"

    # --- Redis ---------------------------------------------------------------
    redis_url: str = "redis://localhost:6379/0"
    redis_cache_ttl: int = 300

    # --- Cookies / session ---------------------------------------------------
    cookie_domain: str | None = None
    cookie_secure: bool = True
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    access_token_cookie: str = "fv_access"
    refresh_token_cookie: str = "fv_refresh"
    csrf_cookie: str = "fv_csrf"
    csrf_header: str = "X-CSRF-Token"
    access_token_ttl_seconds: int = 900
    refresh_token_ttl_seconds: int = 604800
    idle_timeout_seconds: int = 1800
    absolute_session_timeout_seconds: int = 43200

    # --- Security ------------------------------------------------------------
    # NoDecode: env values are comma-separated, not JSON. Without it
    # pydantic-settings attempts json.loads() before validators run.
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)
    trusted_hosts: Annotated[list[str], NoDecode] = Field(default_factory=lambda: ["*"])
    rate_limit_enabled: bool = True
    rate_limit_default: str = "200/minute"
    rate_limit_auth: str = "10/minute"
    max_login_attempts: int = 5
    account_lockout_seconds: int = 900
    max_upload_bytes: int = 20 * 1024 * 1024

    # --- Email (Brevo SMTP Relay) --------------------------------------------
    smtp_host: str = "smtp-relay.brevo.com"
    smtp_port: int = 587
    smtp_user: str = ""          # Brevo sender email
    smtp_password: str = ""      # Brevo API key used as SMTP password
    smtp_from: str = "Finovara Advisory <no-reply@finovara.com>"
    smtp_starttls: bool = True

    # Brevo Transactional API (optional – use instead of / alongside SMTP)
    brevo_api_key: str = ""
    brevo_sender_email: str = ""
    brevo_sender_name: str = "Finovara Advisory"

    @field_validator("cors_origins", "trusted_hosts", mode="before")
    @classmethod
    def _split_csv(cls, v: object) -> object:
        """Accept either a JSON list or a comma-separated string."""
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("["):
                return v
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @field_validator("log_level")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.upper()

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def supabase_jwks_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

    @property
    def sqlalchemy_url(self) -> str:
        return str(self.database_url)

    @model_validator(mode="after")
    def _enforce_production_hardening(self) -> Settings:
        """Fail fast rather than boot a production service with unsafe defaults."""
        if not self.is_production:
            return self

        problems: list[str] = []
        if self.debug:
            problems.append("DEBUG must be false in production")
        if not self.cookie_secure:
            problems.append("COOKIE_SECURE must be true in production")
        if not self.supabase_service_role_key:
            problems.append("SUPABASE_SERVICE_ROLE_KEY is required in production")
        if self.supabase_jwt_algorithm == "HS256" and not self.supabase_jwt_secret:
            problems.append("SUPABASE_JWT_SECRET is required when using HS256")
        if not self.cors_origins or "*" in self.cors_origins:
            problems.append("CORS_ORIGINS must be an explicit allow-list in production")
        if self.trusted_hosts == ["*"]:
            problems.append("TRUSTED_HOSTS must be an explicit allow-list in production")
        if self.cookie_samesite == "none" and not self.cookie_secure:
            problems.append("SameSite=None requires Secure cookies")

        if problems:
            raise ValueError("Unsafe production configuration: " + "; ".join(problems))
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
