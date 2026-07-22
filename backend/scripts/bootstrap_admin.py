"""Create the first Super Admin, and optionally demo accounts for testing.

Why this exists as a script and not an endpoint: ``handle_new_user`` forces every
self-service signup to the 'client' role, which closes a privilege-escalation
hole but leaves no way to mint the first administrator. An "elevate me to admin"
API would be an obvious attack surface, so bootstrapping happens out of band,
server-side, by someone who already holds the service-role key.

    python scripts/bootstrap_admin.py --email you@firm.com --password '...'
    python scripts/bootstrap_admin.py --demo          # adds staff + client accounts
    python scripts/bootstrap_admin.py --list          # show existing users and roles
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import secrets
import string
import sys
from pathlib import Path

import asyncpg
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
from migrate import dsn_from_env  # noqa: E402

MIN_PASSWORD_LENGTH = 12


def env(key: str) -> str:
    dsn_from_env()  # side effect: loads backend/.env into os.environ
    return os.environ.get(key, "").strip()


def strong_password(length: int = 20) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*-_"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def validate_password(password: str) -> None:
    problems = []
    if len(password) < MIN_PASSWORD_LENGTH:
        problems.append(f"at least {MIN_PASSWORD_LENGTH} characters")
    if not re.search(r"[A-Z]", password):
        problems.append("an uppercase letter")
    if not re.search(r"[a-z]", password):
        problems.append("a lowercase letter")
    if not re.search(r"\d", password):
        problems.append("a digit")
    if problems:
        sys.exit("Password must contain " + ", ".join(problems) + ".")


async def create_auth_user(email: str, password: str, full_name: str) -> str:
    """Create the identity in Supabase Auth. Returns the user id."""
    base = env("SUPABASE_URL").rstrip("/")
    key = env("SUPABASE_SERVICE_ROLE_KEY")
    if not base or not key:
        sys.exit("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env.")

    first, _, last = full_name.partition(" ")
    headers = {"Authorization": f"Bearer {key}", "apikey": key, "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{base}/auth/v1/admin/users",
            headers=headers,
            json={
                "email": email,
                "password": password,
                # Bootstrap accounts skip the confirmation email deliberately.
                "email_confirm": True,
                "user_metadata": {"first_name": first, "last_name": last or ""},
            },
        )

        if response.status_code in (200, 201):
            return response.json()["id"]

        # Already present: look the id up rather than failing the whole run.
        if response.status_code in (409, 422) or "already" in response.text.lower():
            listing = await client.get(
                f"{base}/auth/v1/admin/users", headers=headers, params={"page": 1, "per_page": 200}
            )
            for user in listing.json().get("users", []):
                if user.get("email", "").lower() == email.lower():
                    print(f"    (identity already existed, reusing {user['id']})")
                    return user["id"]

        sys.exit(f"Could not create the auth user: HTTP {response.status_code} {response.text[:300]}")


async def assign_role(conn: asyncpg.Connection, user_id: str, role_code: str, full_name: str) -> None:
    role_id = await conn.fetchval("select id from public.roles where code = $1", role_code)
    if role_id is None:
        sys.exit(f"Role '{role_code}' does not exist. Run the migrations first.")

    first, _, last = full_name.partition(" ")
    await conn.execute(
        """
        update public.users
           set role_id = $2, first_name = $3, last_name = $4, status = 'active'
         where id = $1
        """,
        user_id, role_id, first, last or "",
    )


async def ensure_employee(conn: asyncpg.Connection, user_id: str, designation: str, department: str) -> None:
    exists = await conn.fetchval("select 1 from public.employees where user_id = $1", user_id)
    if exists:
        return
    branch_id = await conn.fetchval("select id from public.branches order by code limit 1")
    await conn.execute(
        """
        insert into public.employees (user_id, branch_id, designation, department, date_of_joining)
        values ($1, $2, $3, $4, current_date)
        """,
        user_id, branch_id, designation, department,
    )


async def ensure_client(conn: asyncpg.Connection, user_id: str, legal_name: str) -> None:
    exists = await conn.fetchval("select 1 from public.clients where user_id = $1", user_id)
    if exists:
        return
    branch_id = await conn.fetchval("select id from public.branches order by code limit 1")
    client_id = await conn.fetchval(
        """
        insert into public.clients (user_id, branch_id, client_type, status)
        values ($1, $2, 'private_limited', 'active') returning id
        """,
        user_id, branch_id,
    )
    await conn.execute(
        """
        insert into public.client_entities (client_id, legal_name, entity_type, registered_address)
        values ($1, $2, 'pvt_ltd', 'Hyderabad, Telangana, India')
        """,
        client_id, legal_name,
    )


async def provision(email: str, password: str, full_name: str, role_code: str,
                    designation: str | None = None, department: str | None = None,
                    company: str | None = None) -> tuple[str, str]:
    print(f"  {role_code:<22} {email}")
    user_id = await create_auth_user(email, password, full_name)

    conn = await asyncpg.connect(dsn_from_env(), statement_cache_size=0, timeout=30)
    try:
        # handle_new_user runs asynchronously relative to the API call; wait for it.
        for _ in range(20):
            if await conn.fetchval("select 1 from public.users where id = $1", user_id):
                break
            await asyncio.sleep(0.3)
        else:
            sys.exit(f"Profile row for {email} was never created — check handle_new_user.")

        await assign_role(conn, user_id, role_code, full_name)
        if role_code == "client":
            await ensure_client(conn, user_id, company or full_name)
        else:
            await ensure_employee(conn, user_id, designation or "Staff", department or "Operations")
    finally:
        await conn.close()
    return user_id, password


async def list_users() -> int:
    conn = await asyncpg.connect(dsn_from_env(), statement_cache_size=0, timeout=30)
    try:
        rows = await conn.fetch(
            """
            select u.email, r.code as role, u.status,
                   (e.id is not null) as is_employee,
                   (c.id is not null) as is_client
              from public.users u
              left join public.roles r on r.id = u.role_id
              left join public.employees e on e.user_id = u.id
              left join public.clients c on c.user_id = u.id
             where u.deleted_at is null
             order by r.code, u.email
            """
        )
        if not rows:
            print("No users yet. Run with --email/--password to create the first admin.")
            return 0
        print(f"\n{'EMAIL':<40} {'ROLE':<24} {'STATUS':<10} PROFILE")
        print("-" * 92)
        for r in rows:
            profile = "employee" if r["is_employee"] else "client" if r["is_client"] else "-"
            print(f"{r['email']:<40} {r['role'] or '-':<24} {r['status']:<10} {profile}")
        print(f"\n{len(rows)} user(s).")
        return 0
    finally:
        await conn.close()


async def main(args: argparse.Namespace) -> int:
    if args.list:
        return await list_users()

    created: list[tuple[str, str, str]] = []

    if args.email:
        password = args.password or strong_password()
        if args.password:
            validate_password(password)
        print("\nProvisioning administrator:")
        await provision(args.email, password, args.name or "Super Admin", "super_admin",
                        "Managing Partner", "Administration")
        created.append(("super_admin", args.email, password))

    if args.demo:
        print("\nProvisioning demo accounts:")
        demo = [
            ("partner@finovara.demo",    "managing_partner",     "Meera Iyer",    "Managing Partner", "Leadership", None),
            ("ca@finovara.demo",         "chartered_accountant", "Arjun Rao",     "Chartered Accountant", "Audit", None),
            ("gst@finovara.demo",        "gst_consultant",       "Neha Gupta",    "GST Consultant", "GST", None),
            ("payroll@finovara.demo",    "payroll_executive",    "Vikram Singh",  "Payroll Executive", "Payroll", None),
            ("accounts@finovara.demo",   "accounts_admin",       "Sana Khan",     "Accounts Admin", "Finance", None),
            ("tax@finovara.demo",        "tax_manager",          "Kavita Nair",   "Tax Manager", "Direct Tax", None),
            ("audit@finovara.demo",      "audit_manager",        "Rohit Desai",   "Audit Manager", "Audit", None),
            ("accountant@finovara.demo", "accountant",           "Priya Menon",   "Accountant", "Accounting", None),
            ("rm@finovara.demo",         "relationship_manager", "Imran Sheikh",  "Relationship Manager", "Client Services", None),
            ("content@finovara.demo",    "content_manager",      "Divya Kapoor",  "Content Manager", "Marketing", None),
            ("client@finovara.demo",     "client",               "Rahul Mehta",   None, None, "Mehta Industries Pvt Ltd"),
        ]
        for email, role, name, designation, department, company in demo:
            password = args.demo_password or strong_password()
            await provision(email, password, name, role, designation, department, company)
            created.append((role, email, password))

    if not created:
        print("Nothing to do. Pass --email/--password, --demo, or --list.")
        return 0

    print("\n" + "=" * 78)
    print("ACCOUNTS CREATED — store these now, they are not recoverable")
    print("=" * 78)
    print(f"{'ROLE':<24} {'EMAIL':<28} PASSWORD")
    print("-" * 78)
    for role, email, password in created:
        print(f"{role:<24} {email:<28} {password}")
    print("\nSign in at the client portal. Change these passwords after first login.")
    print("Demo accounts use the .demo domain and should be removed before go-live.")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bootstrap the first administrator.")
    parser.add_argument("--email", help="Administrator email address.")
    parser.add_argument("--password", help="Administrator password (generated if omitted).")
    parser.add_argument("--name", help="Full name, e.g. 'Priya Nair'.")
    parser.add_argument("--demo", action="store_true", help="Also create one account per major role.")
    parser.add_argument("--demo-password", help="Shared password for the demo accounts.")
    parser.add_argument("--list", action="store_true", help="List existing users and their roles.")
    sys.exit(asyncio.run(main(parser.parse_args())))
