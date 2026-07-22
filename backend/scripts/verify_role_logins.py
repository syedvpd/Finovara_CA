"""Sign in as every role and confirm the session it gets back.

Handover claims that "all dashboards work" are worth exactly as much as the
last time someone checked. This signs in as each account, exchanges the token
for a session, and prints the role, staff flag and permission count the API
actually returns — so a broken or mis-scoped account shows up here rather than
in front of a client.
"""

import asyncio
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv(".env")

API = os.environ.get("E2E_API", "http://localhost:8000")
PASSWORD = os.environ.get("DEMO_PASSWORD", "Finovara@Demo2026")

ACCOUNTS = [
    ("Super Admin", "admin@finovara.demo", os.environ.get("ADMIN_PASSWORD", "Finovara@Admin2026")),
    ("Managing Partner", "partner@finovara.demo", PASSWORD),
    ("Chartered Accountant", "ca@finovara.demo", PASSWORD),
    ("Audit Manager", "audit@finovara.demo", PASSWORD),
    ("Tax Manager", "tax@finovara.demo", PASSWORD),
    ("GST Consultant", "gst@finovara.demo", PASSWORD),
    ("Accountant", "accountant@finovara.demo", PASSWORD),
    ("Payroll Executive", "payroll@finovara.demo", PASSWORD),
    ("Relationship Manager", "rm@finovara.demo", PASSWORD),
    ("Accounts Admin", "accounts@finovara.demo", PASSWORD),
    ("Content Manager", "content@finovara.demo", PASSWORD),
    ("Client", "client@finovara.demo", PASSWORD),
]

EXPECTED_SLUG = {
    "Super Admin": "super_admin",
    "Managing Partner": "managing_partner",
    "Chartered Accountant": "chartered_accountant",
    "Audit Manager": "audit_manager",
    "Tax Manager": "tax_manager",
    "GST Consultant": "gst_consultant",
    "Accountant": "accountant",
    "Payroll Executive": "payroll_executive",
    "Relationship Manager": "relationship_manager",
    "Accounts Admin": "accounts_admin",
    "Content Manager": "content_manager",
    "Client": "client",
}


async def main() -> int:
    supabase = os.environ["SUPABASE_URL"].rstrip("/")
    anon = os.environ["SUPABASE_ANON_KEY"]
    failures = 0

    print(f"{'ROLE':<22} {'EMAIL':<28} {'SIGN-IN':<8} {'ROLE RETURNED':<22} {'STAFF':<6} PERMS")
    print("-" * 96)

    for label, email, password in ACCOUNTS:
        # A fresh client per account: reusing one would carry the previous
        # session cookie into the next sign-in, and the double-submit CSRF check
        # rejects a cookie that arrives without its matching header.
        async with httpx.AsyncClient(timeout=60) as http:
            token_response = await http.post(
                f"{supabase}/auth/v1/token?grant_type=password",
                headers={"apikey": anon},
                json={"email": email, "password": password},
            )
            if token_response.status_code != 200:
                print(f"{label:<22} {email:<28} {'FAIL':<8} could not authenticate")
                failures += 1
                continue

            token = token_response.json()["access_token"]
            session = await http.post(
                f"{API}/api/v1/auth/session",
                json={"access_token": token},
                headers={"Content-Type": "application/json"},
            )
            if session.status_code not in (200, 201):
                print(f"{label:<22} {email:<28} {'FAIL':<8} session {session.status_code}")
                failures += 1
                continue

            data = session.json()["data"]
            role = data["role"]
            ok = role == EXPECTED_SLUG[label]
            expected_staff = label != "Client"
            if data["is_staff"] != expected_staff:
                ok = False

            print(
                f"{label:<22} {email:<28} {'ok' if ok else 'WRONG':<8} "
                f"{role:<22} {str(data['is_staff']):<6} {len(data['permissions'])}"
            )
            if not ok:
                failures += 1

    print("-" * 96)
    print(f"{len(ACCOUNTS) - failures}/{len(ACCOUNTS)} accounts sign in with the expected role.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
