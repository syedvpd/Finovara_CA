"""Migration runner.

Applies the SQL files in supabase/migrations in filename order, once each,
recording what has run in public.schema_migrations. Each file runs inside a
transaction, so a failure leaves no half-applied migration behind.

Usage:
    python scripts/migrate.py            # apply anything outstanding
    python scripts/migrate.py --status   # report without changing anything
    python scripts/migrate.py --file X   # apply one file by name
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import re
import sys
from pathlib import Path

import asyncpg

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
MIGRATIONS_DIR = REPO_ROOT / "supabase" / "migrations"

TRACKING_TABLE = """
create table if not exists public.schema_migrations (
    version     varchar(255) primary key,
    checksum    varchar(64) not null,
    applied_at  timestamptz not null default now(),
    duration_ms integer
)
"""


def dsn_from_env() -> str:
    """Build a plain asyncpg DSN from DATABASE_URL in the environment/.env."""
    import os

    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

    url = os.environ.get("DATABASE_URL", "")
    if not url:
        sys.exit("DATABASE_URL is not set. Populate backend/.env first.")
    # asyncpg wants a bare postgresql:// DSN, not the SQLAlchemy dialect form.
    return re.sub(r"^postgresql\+asyncpg://", "postgresql://", url)


def checksum(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


async def baseline(versions: list[str]) -> int:
    """Record migrations as applied without running them.

    For a database that was provisioned before this runner existed: the objects
    are already there, so re-running would fail on duplicates.
    """
    conn = await asyncpg.connect(dsn_from_env(), statement_cache_size=0, timeout=30)
    try:
        await conn.execute(TRACKING_TABLE)
        for version in versions:
            path = MIGRATIONS_DIR / version
            if not path.exists():
                print(f"  skip {version} (not found)")
                continue
            await conn.execute(
                "insert into public.schema_migrations (version, checksum, duration_ms) "
                "values ($1, $2, 0) on conflict (version) do nothing",
                version, checksum(path.read_text(encoding="utf-8")),
            )
            print(f"  baselined {version}")
        return 0
    finally:
        await conn.close()


async def run(status_only: bool = False, only_file: str | None = None) -> int:
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not files:
        sys.exit(f"No migrations found in {MIGRATIONS_DIR}")

    conn = await asyncpg.connect(dsn_from_env(), statement_cache_size=0, timeout=30)
    try:
        await conn.execute(TRACKING_TABLE)
        applied = {
            row["version"]: row["checksum"]
            for row in await conn.fetch("select version, checksum from public.schema_migrations")
        }

        print(f"{'MIGRATION':<45} {'STATUS':<12} {'NOTE'}")
        print("-" * 92)

        pending: list[Path] = []
        for path in files:
            version = path.name
            sql = path.read_text(encoding="utf-8")
            digest = checksum(sql)

            if version in applied:
                # A changed file that has already run is a real hazard: the
                # database no longer matches what the repo says it contains.
                drift = applied[version] != digest
                print(f"{version:<45} {'applied':<12} {'CHECKSUM DRIFT' if drift else ''}")
            else:
                print(f"{version:<45} {'pending':<12}")
                pending.append(path)

        if status_only:
            print(f"\n{len(applied)} applied, {len(pending)} pending.")
            return 0

        if only_file:
            pending = [p for p in files if p.name == only_file and p.name not in applied]
            if not pending:
                print(f"\nNothing to do for '{only_file}'.")
                return 0

        if not pending:
            print("\nDatabase is up to date.")
            return 0

        print(f"\nApplying {len(pending)} migration(s)…\n")
        for path in pending:
            sql = path.read_text(encoding="utf-8")
            print(f"  -> {path.name}")
            started = asyncio.get_event_loop().time()
            try:
                async with conn.transaction():
                    await conn.execute(sql)
                    elapsed = int((asyncio.get_event_loop().time() - started) * 1000)
                    await conn.execute(
                        "insert into public.schema_migrations (version, checksum, duration_ms) "
                        "values ($1, $2, $3)",
                        path.name, checksum(sql), elapsed,
                    )
                print(f"    applied in {elapsed} ms")
            except Exception as exc:
                print(f"\n    FAILED: {type(exc).__name__}: {exc}")
                print("    The transaction was rolled back; no partial changes were made.")
                return 1

        print("\nAll migrations applied.")
        return 0
    finally:
        await conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Apply Supabase migrations.")
    parser.add_argument("--status", action="store_true", help="Report state without applying.")
    parser.add_argument("--file", help="Apply a single migration by filename.")
    parser.add_argument(
        "--baseline", nargs="+", metavar="VERSION",
        help="Mark migrations as applied without running them (already-provisioned database).",
    )
    args = parser.parse_args()
    if args.baseline:
        sys.exit(asyncio.run(baseline(args.baseline)))
    sys.exit(asyncio.run(run(status_only=args.status, only_file=args.file)))
