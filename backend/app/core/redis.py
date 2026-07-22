"""Redis client, cache helper, and the counters backing rate limiting."""

from __future__ import annotations

import json
from typing import Any

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_client: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    global _client
    if _client is None:
        _client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            health_check_interval=30,
            retry_on_timeout=True,
        )
    return _client


async def check_redis() -> bool:
    try:
        return bool(await get_redis().ping())
    except Exception as exc:  # noqa: BLE001 - health probe must not raise
        logger.warning("redis_health_check_failed", error=str(exc))
        return False


async def close_redis() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


class Cache:
    """Namespaced JSON cache. Never fails the request when Redis is down."""

    def __init__(self, namespace: str, ttl: int | None = None) -> None:
        self.namespace = namespace
        self.ttl = ttl or settings.redis_cache_ttl

    def _key(self, key: str) -> str:
        return f"fv:{self.namespace}:{key}"

    async def get(self, key: str) -> Any | None:
        try:
            raw = await get_redis().get(self._key(key))
            return json.loads(raw) if raw else None
        except Exception as exc:  # noqa: BLE001
            logger.warning("cache_get_failed", key=key, error=str(exc))
            return None

    async def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        try:
            await get_redis().set(self._key(key), json.dumps(value, default=str), ex=ttl or self.ttl)
        except Exception as exc:  # noqa: BLE001
            logger.warning("cache_set_failed", key=key, error=str(exc))

    async def delete(self, *keys: str) -> None:
        try:
            if keys:
                await get_redis().delete(*[self._key(k) for k in keys])
        except Exception as exc:  # noqa: BLE001
            logger.warning("cache_delete_failed", error=str(exc))

    async def invalidate_namespace(self) -> None:
        """Remove every key in this namespace (SCAN-based, non-blocking)."""
        try:
            client = get_redis()
            async for key in client.scan_iter(match=f"fv:{self.namespace}:*", count=500):
                await client.delete(key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("cache_invalidate_failed", namespace=self.namespace, error=str(exc))


async def incr_with_expiry(key: str, window_seconds: int) -> int:
    """Atomically increment a fixed-window counter. Returns the new count."""
    client = get_redis()
    pipe = client.pipeline()
    pipe.incr(key)
    pipe.expire(key, window_seconds, nx=True)
    result = await pipe.execute()
    return int(result[0])
