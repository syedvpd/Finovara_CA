"""Async SQLAlchemy engine and session management."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session as SyncSession
from sqlalchemy.pool import NullPool
from sqlalchemy.sql import text

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _engine_kwargs() -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "echo": settings.database_echo,
        "pool_pre_ping": True,
        "future": True,
    }

    if settings.database_use_pgbouncer:
        # pgbouncer in transaction mode cannot support server-side prepared
        # statements or a client-side pool, so both are disabled.
        kwargs["poolclass"] = NullPool
        kwargs["connect_args"] = {
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        }
    else:
        kwargs.update(
            pool_size=settings.database_pool_size,
            max_overflow=settings.database_max_overflow,
            pool_recycle=settings.database_pool_recycle,
            pool_timeout=30,
        )

    return kwargs


engine = create_async_engine(settings.sqlalchemy_url, **_engine_kwargs())

SessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


CLAIMS_KEY = "jwt_claims"


def attach_claims(session: AsyncSession, claims: dict[str, Any] | None) -> None:
    """Stage the caller's JWT claims for the next transaction.

    Nothing is sent to the database here. The claims are published by the
    ``after_begin`` hook below, so an endpoint that never queries (an
    authorization rejection, a validation failure) costs no connection.
    """
    if claims:
        session.sync_session.info[CLAIMS_KEY] = json.dumps(claims, default=str)


@event.listens_for(SyncSession, "after_begin")
def _publish_claims(session: SyncSession, transaction: Any, connection: Any) -> None:
    """Set ``request.jwt.claims`` as the transaction opens.

    Supabase's ``auth.uid()`` and the RLS helpers read this GUC. Setting it
    keeps the database-side audit triggers and row-level policies meaningful
    even though the application connects with its own role. ``true`` scopes the
    setting to the transaction, so it cannot leak across pooled connections.
    """
    claims = session.info.get(CLAIMS_KEY)
    if claims:
        connection.execute(
            text("select set_config('request.jwt.claims', :claims, true)"), {"claims": claims}
        )


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: one session per request, committed on success."""
    async with SessionFactory() as session:
        try:
            yield session
            if session.in_transaction():
                await session.commit()
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def session_scope(claims: dict[str, Any] | None = None) -> AsyncIterator[AsyncSession]:
    """Transactional scope for background workers and scripts."""
    async with SessionFactory() as session:
        try:
            attach_claims(session, claims)
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def check_database() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))
        return True
    except Exception as exc:  # noqa: BLE001 - health probe must not raise
        logger.warning("database_health_check_failed", error=str(exc))
        return False


async def dispose_engine() -> None:
    await engine.dispose()
