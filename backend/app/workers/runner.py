"""Worker entry point.

    python -m app.workers.runner              # run everything
    python -m app.workers.runner --once       # single pass, then exit (CI/cron)
    python -m app.workers.runner --only notifications

Run this as a separate process from the API. It shares the same database and
settings but has its own lifecycle, so a slow report cannot block a request.
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from app.core.logging import get_logger
from app.db.session import dispose_engine
from app.workers import notifications, reports, scheduled
from app.workers.base import Job, bootstrap, run_job_once, run_scheduler

logger = get_logger(__name__)

MINUTE = 60
HOUR = 60 * MINUTE

#: name -> (job, group)
ALL_JOBS: list[tuple[Job, str]] = [
    # Queue drains — frequent, cheap.
    (Job("notifications.dispatch", notifications.dispatch_pending, 15), "notifications"),
    (Job("notifications.expire", notifications.expire_abandoned, HOUR, defer_first_run=True), "notifications"),
    (Job("reports.generate", reports.generate_queued, 20), "reports"),
    (Job("reports.expire", reports.expire_old_reports, 6 * HOUR, defer_first_run=True), "reports"),

    # Daily sweeps — the due-date and reminder engines.
    (Job("compliance.mark_overdue", scheduled.mark_overdue_compliance, 6 * HOUR), "scheduled"),
    (Job("compliance.reminders", scheduled.queue_compliance_reminders, 6 * HOUR), "scheduled"),
    (Job("invoices.mark_overdue", scheduled.mark_overdue_invoices, 6 * HOUR), "scheduled"),
    (Job("documents.mark_overdue", scheduled.mark_overdue_document_requests, 6 * HOUR), "scheduled"),
    (Job("sessions.purge", scheduled.purge_expired_sessions, 12 * HOUR, defer_first_run=True), "scheduled"),
]


def select_jobs(only: list[str] | None) -> list[Job]:
    if not only:
        return [job for job, _ in ALL_JOBS]
    wanted = set(only)
    chosen = [job for job, group in ALL_JOBS if group in wanted or job.name in wanted]
    if not chosen:
        sys.exit(
            f"No jobs matched {sorted(wanted)}. "
            f"Groups: notifications, reports, scheduled. "
            f"Jobs: {', '.join(job.name for job, _ in ALL_JOBS)}"
        )
    return chosen


async def main(once: bool, only: list[str] | None) -> int:
    bootstrap()
    jobs = select_jobs(only)

    try:
        if once:
            logger.info("worker_single_pass", jobs=[j.name for j in jobs])
            failures = 0
            for job in jobs:
                result = await run_job_once(job)
                print(f"  {job.name:34s} processed={result.processed:<5} failed={result.failed}")
                failures += result.failed
            return 0
        await run_scheduler(jobs)
        return 0
    finally:
        await dispose_engine()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Finovara background workers.")
    parser.add_argument("--once", action="store_true", help="Run each job once and exit.")
    parser.add_argument("--only", nargs="+", metavar="NAME", help="Restrict to a group or job name.")
    args = parser.parse_args()
    sys.exit(asyncio.run(main(args.once, args.only)))
