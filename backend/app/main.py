"""FastAPI application factory."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import ORJSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1 import health
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.redis import check_redis, close_redis
from app.db.session import check_database, dispose_engine
from app.middleware.error_handlers import register_exception_handlers
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.request_context import REQUEST_ID_HEADER, RequestContextMiddleware
from app.middleware.security_headers import BodySizeLimitMiddleware, SecurityHeadersMiddleware

logger = get_logger(__name__)

DESCRIPTION = """
Finovara Chartered Accountants LLP — ERP, client portal, and corporate website API.

Authentication uses Supabase-issued JWTs, presented either as a bearer token or
via an HTTP-only cookie. Cookie-authenticated mutations additionally require the
double-submit CSRF header.
"""


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    logger.info("startup_begin", environment=settings.app_env, version=health.API_VERSION)

    db_ok = await check_database()
    redis_ok = await check_redis()

    if not db_ok:
        # Surfaced loudly, but the process still starts so the readiness probe
        # can report the fault rather than crash-looping the container.
        logger.error("startup_database_unreachable")
    if not redis_ok:
        logger.warning("startup_redis_unreachable", impact="caching and rate limiting degraded")

    logger.info("startup_complete", database=db_ok, redis=redis_ok)
    try:
        yield
    finally:
        logger.info("shutdown_begin")
        await dispose_engine()
        await close_redis()
        logger.info("shutdown_complete")


def create_app() -> FastAPI:
    configure_logging()

    app = FastAPI(
        title=settings.app_name,
        description=DESCRIPTION,
        version=health.API_VERSION,
        openapi_url=None if settings.is_production else "/openapi.json",
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None if settings.is_production else "/redoc",
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
        contact={"name": "Finovara Advisory", "email": "tech@finovara.com"},
    )

    # Middleware runs in reverse registration order, so the outermost concern
    # (request id) is registered last.
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(BodySizeLimitMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)

    if settings.trusted_hosts and settings.trusted_hosts != ["*"]:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,  # cookie auth requires this
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type", settings.csrf_header, REQUEST_ID_HEADER],
            expose_headers=[REQUEST_ID_HEADER, "X-RateLimit-Remaining", "X-RateLimit-Reset"],
            max_age=600,
        )

    app.add_middleware(RequestContextMiddleware)

    register_exception_handlers(app)

    app.include_router(health.router)
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    return app


app = create_app()
