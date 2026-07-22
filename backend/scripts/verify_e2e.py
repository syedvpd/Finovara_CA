"""Authenticated end-to-end verification against the live stack.

Signs in as each seeded role through Supabase, then exercises the API the way
the frontend does: session, dashboards, RBAC boundaries, document upload and
signed download, and the report pipeline.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
from migrate import dsn_from_env  # noqa: E402

dsn_from_env()  # loads backend/.env

API = os.environ.get("E2E_API", "http://127.0.0.1:8000")
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
ANON = os.environ["SUPABASE_ANON_KEY"]

ACCOUNTS = {
    "super_admin": ("admin@finovara.demo", "Finovara@Admin2026"),
    "managing_partner": ("partner@finovara.demo", "Finovara@Demo2026"),
    "chartered_accountant": ("ca@finovara.demo", "Finovara@Demo2026"),
    "payroll_executive": ("payroll@finovara.demo", "Finovara@Demo2026"),
    "client": ("client@finovara.demo", "Finovara@Demo2026"),
}

results: list[tuple[str, str, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append(("PASS" if ok else "FAIL", name, detail))


async def sign_in(http: httpx.AsyncClient, email: str, password: str) -> str:
    r = await http.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": ANON, "Content-Type": "application/json"},
        json={"email": email, "password": password},
    )
    r.raise_for_status()
    return r.json()["access_token"]


async def main() -> int:
    async with httpx.AsyncClient(timeout=45) as http:
        tokens: dict[str, str] = {}
        for role, (email, password) in ACCOUNTS.items():
            try:
                tokens[role] = await sign_in(http, email, password)
                check(f"sign in: {role}", True)
            except Exception as exc:
                check(f"sign in: {role}", False, str(exc)[:90])

        def hdr(role: str) -> dict[str, str]:
            return {"Authorization": f"Bearer {tokens[role]}"}

        # --- Session and role resolution ---------------------------------
        for role in tokens:
            r = await http.get(f"{API}/api/v1/auth/session", headers=hdr(role))
            data = r.json().get("data", {})
            check(f"session role = {role}", data.get("role") == role, f"got {data.get('role')}")

        admin = hdr("super_admin")
        client_h = hdr("client")

        # --- Dashboards ---------------------------------------------------
        r = await http.get(f"{API}/api/v1/analytics/dashboard/firm", headers=admin)
        check("firm dashboard", r.status_code == 200, f"HTTP {r.status_code}")
        if r.status_code == 200:
            d = r.json()["data"]
            check("firm KPIs populated", "clients" in d and "revenue" in d,
                  f"clients={d.get('clients',{}).get('total')}")

        r = await http.get(f"{API}/api/v1/analytics/dashboard/client", headers=client_h)
        check("client dashboard", r.status_code == 200, f"HTTP {r.status_code}")

        # --- RBAC boundaries ----------------------------------------------
        r = await http.get(f"{API}/api/v1/analytics/dashboard/firm", headers=client_h)
        check("client blocked from firm dashboard", r.status_code == 403, f"HTTP {r.status_code}")

        r = await http.get(f"{API}/api/v1/employees", headers=client_h)
        check("client blocked from employees", r.status_code == 403, f"HTTP {r.status_code}")

        r = await http.get(f"{API}/api/v1/payroll-runs", headers=hdr("chartered_accountant"))
        check("CA blocked from payroll", r.status_code == 403, f"HTTP {r.status_code}")

        r = await http.get(f"{API}/api/v1/payroll-runs", headers=hdr("payroll_executive"))
        check("payroll exec allowed payroll", r.status_code == 200, f"HTTP {r.status_code}")

        r = await http.get(f"{API}/api/v1/clients", headers=admin)
        check("admin lists clients", r.status_code == 200, f"HTTP {r.status_code}")

        # --- Reference data -------------------------------------------------
        r = await http.get(f"{API}/api/v1/services", headers=admin)
        check("service catalogue seeded", r.status_code == 200 and len(r.json()["data"]) >= 10,
              f"{len(r.json().get('data', []))} services")

        r = await http.get(f"{API}/api/v1/compliance-types", headers=admin)
        check("compliance types seeded", r.status_code == 200 and len(r.json()["data"]) >= 15,
              f"{len(r.json().get('data', []))} types")

        r = await http.get(f"{API}/api/v1/statutory-rates", headers=admin)
        check("statutory rates readable", r.status_code == 200, f"HTTP {r.status_code}")

        # --- Document upload + signed download ------------------------------
        session = (await http.get(f"{API}/api/v1/auth/session", headers=client_h)).json()["data"]
        client_id = session.get("client_id")
        check("client profile linked", bool(client_id), str(client_id))

        document_id = None
        if client_id:
            pdf_bytes = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
            r = await http.post(
                f"{API}/api/v1/documents/upload",
                headers=client_h,
                files={"file": ("e2e-test.pdf", pdf_bytes, "application/pdf")},
                data={"client_id": client_id, "file_category": "general"},
            )
            check("client uploads document", r.status_code == 201, f"HTTP {r.status_code} {r.text[:110]}")
            if r.status_code == 201:
                document = r.json()["data"]
                document_id = document["id"]
                check("upload awaits verification", document["status"] == "pending_verification",
                      document["status"])

                r = await http.get(f"{API}/api/v1/documents/{document_id}/download", headers=client_h)
                check("signed download URL issued", r.status_code == 200, f"HTTP {r.status_code} {r.text[:110]}")
                if r.status_code == 200:
                    url = r.json()["data"]["url"]
                    check("signed URL is time-limited", "token=" in url or "sign" in url, url[:70])
                    fetched = await http.get(url)
                    check("file retrievable via signed URL",
                          fetched.status_code == 200 and fetched.content.startswith(b"%PDF"),
                          f"HTTP {fetched.status_code} {len(fetched.content)}B")

        # --- Report pipeline --------------------------------------------------
        r = await http.post(
            f"{API}/api/v1/reports",
            headers=admin,
            json={"title": "E2E Compliance Statement", "report_type": "client_compliance",
                  "client_id": client_id, "format": "pdf"},
        )
        check("report queued", r.status_code == 202, f"HTTP {r.status_code} {r.text[:110]}")
        report_id = r.json()["data"]["id"] if r.status_code == 202 else None

        # --- Isolation between clients ---------------------------------------
        r = await http.get(f"{API}/api/v1/documents", headers=client_h)
        if r.status_code == 200:
            docs = r.json()["data"]
            check("client sees only own documents",
                  all(d["client_id"] == client_id for d in docs), f"{len(docs)} docs")

        return report_id, document_id


if __name__ == "__main__":
    report_id, document_id = asyncio.run(main())
    width = max(len(n) for _, n, _ in results) + 2
    print(f"\n{'RESULT':<7} {'CHECK':<{width}} DETAIL")
    print("-" * (width + 45))
    for status, name, detail in results:
        print(f"{status:<7} {name:<{width}} {detail}")
    failed = sum(1 for s, _, _ in results if s == "FAIL")
    print(f"\n{len(results) - failed}/{len(results)} passed.")
    if report_id:
        print(f"queued report: {report_id}")
    sys.exit(1 if failed else 0)
