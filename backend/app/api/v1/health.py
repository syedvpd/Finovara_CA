"""Liveness, readiness, and version endpoints for orchestrators and probes."""

from __future__ import annotations

from fastapi import APIRouter, Response, status

from app.core.config import settings
from app.core.redis import check_redis
from app.db.session import check_database
from app.schemas.common import HealthStatus

router = APIRouter(tags=["Health"])

API_VERSION = "1.0.0"


@router.get("/health/live", summary="Liveness probe")
async def live() -> dict[str, str]:
    """Process is running. Deliberately checks no dependency."""
    return {"status": "ok"}


@router.get("/health/ready", summary="Readiness probe", response_model=HealthStatus)
async def ready(response: Response) -> HealthStatus:
    """Every dependency required to serve traffic is reachable."""
    checks = {
        "database": await check_database(),
        "redis": await check_redis(),
    }

    if not checks["database"]:
        # Without the database the service cannot serve anything meaningful.
        state: str = "unavailable"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    elif not all(checks.values()):
        # Redis degrades caching and rate limiting but the API still works.
        state = "degraded"
    else:
        state = "ok"

    return HealthStatus(
        status=state,  # type: ignore[arg-type]
        version=API_VERSION,
        environment=settings.app_env,
        checks=checks,
    )


@router.get("/health", summary="Aggregate health", response_model=HealthStatus)
async def health(response: Response) -> HealthStatus:
    return await ready(response)
