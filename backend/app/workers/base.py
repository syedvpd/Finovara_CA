"""Worker scaffolding: polling loops with graceful shutdown.

The queue is the database, not Redis. Notifications and reports already carry
status columns, and `FOR UPDATE SKIP LOCKED` lets several worker processes
drain the same table safely. That keeps the delivery guarantee in the same
transaction as the business data, and removes Redis from the critical path.
"""

from __future__ import annotations

import asyncio
import signal
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.core.logging import configure_logging, get_logger
from app.db.session import session_scope

logger = get_logger(__name__)

#: Set when SIGINT/SIGTERM arrives; loops finish their cycle and exit.
_shutdown = asyncio.Event()


def request_shutdown() -> None:
    _shutdown.set()


def install_signal_handlers() -> None:
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, request_shutdown)
        except NotImplementedError:
            # Windows has no add_signal_handler for these; fall back.
            signal.signal(sig, lambda *_: request_shutdown())


@dataclass(slots=True)
class JobResult:
    processed: int = 0
    failed: int = 0
    detail: dict[str, object] = field(default_factory=dict)


JobFn = Callable[..., Awaitable[JobResult]]


@dataclass(slots=True)
class Job:
    """A unit of recurring work."""

    name: str
    fn: JobFn
    interval_seconds: float
    #: Skip the initial run at startup (for expensive daily sweeps).
    defer_first_run: bool = False
    _next_run: float = 0.0


async def run_job_once(job: Job) -> JobResult:
    """Execute one job in its own transaction, isolating failures."""
    started = datetime.now(timezone.utc)
    try:
        async with session_scope() as session:
            result = await job.fn(session)
        if result.processed or result.failed:
            logger.info(
                "job_completed",
                job=job.name,
                processed=result.processed,
                failed=result.failed,
                duration_ms=int((datetime.now(timezone.utc) - started).total_seconds() * 1000),
                **result.detail,
            )
        return result
    except Exception as exc:  # noqa: BLE001 - one bad cycle must not kill the worker
        logger.exception("job_failed", job=job.name, error=str(exc))
        return JobResult(failed=1)


async def run_scheduler(jobs: list[Job], tick_seconds: float = 1.0) -> None:
    """Run jobs on their own intervals until shutdown is requested."""
    install_signal_handlers()
    loop = asyncio.get_running_loop()
    now = loop.time()

    for job in jobs:
        job._next_run = now + (job.interval_seconds if job.defer_first_run else 0)

    logger.info(
        "worker_started",
        jobs=[{"name": j.name, "every_s": j.interval_seconds} for j in jobs],
    )

    while not _shutdown.is_set():
        now = loop.time()
        due = [job for job in jobs if now >= job._next_run]

        for job in due:
            if _shutdown.is_set():
                break
            await run_job_once(job)
            job._next_run = loop.time() + job.interval_seconds

        try:
            # Wake early if shutdown arrives mid-sleep.
            await asyncio.wait_for(_shutdown.wait(), timeout=tick_seconds)
        except asyncio.TimeoutError:
            pass

    logger.info("worker_stopped")


def bootstrap() -> None:
    configure_logging()
