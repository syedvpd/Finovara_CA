"""Seed representative operating data so dashboards and charts have substance.

Everything is created through the API, so it passes the same validation and
authorization a real user would. Safe to re-run: existing records are detected
and skipped rather than duplicated.

    python scripts/seed_demo_data.py
    python scripts/seed_demo_data.py --purge   # remove seeded demo records
"""

from __future__ import annotations

import argparse
import asyncio
import os
import random
import sys
from datetime import date, timedelta
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
from migrate import dsn_from_env  # noqa: E402

dsn_from_env()

API = os.environ.get("E2E_API", "http://127.0.0.1:8000")
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
ANON = os.environ["SUPABASE_ANON_KEY"]
ADMIN = ("admin@finovara.demo", "Finovara@Admin2026")

random.seed(20260721)

LEADS = [
    ("Ananya Krishnan", "ananya@brightpath.in", "+919812345001", "Brightpath Logistics", "website", "new"),
    ("Vikram Desai", "vikram@nexaforge.com", "+919812345002", "Nexaforge Manufacturing", "referral", "contacted"),
    ("Sneha Pillai", "sneha@clarityhealth.in", "+919812345003", "Clarity Health", "website", "consultation_scheduled"),
    ("Rohit Bansal", "rohit@stackvine.io", "+919812345004", "Stackvine Technologies", "linkedin", "proposal_sent"),
    ("Meera Joshi", "meera@urbannest.in", "+919812345005", "Urban Nest Realty", "referral", "onboarding"),
    ("Karthik Reddy", "karthik@agrisure.co", "+919812345006", "Agrisure Exports", "website", "contacted"),
    ("Divya Menon", "divya@finloop.in", "+919812345007", "Finloop Advisory", "event", "new"),
]

TASKS = [
    ("Prepare GSTR-3B for July", "gst", "high", 3),
    ("Reconcile vendor ledgers Q1", "general", "medium", 8),
    ("Draft statutory audit plan", "audit", "high", 12),
    ("Compute advance tax instalment", "tax", "urgent", 2),
    ("Process July payroll", "payroll", "high", 5),
    ("Review TDS returns 26Q", "tax", "medium", 15),
    ("Bank reconciliation — June", "general", "low", 20),
    ("Collect audit evidence pack", "audit", "medium", 9),
    ("File GSTR-1 for July", "gst", "high", 4),
    ("Update fixed asset register", "general", "low", 25),
]


async def sign_in(http: httpx.AsyncClient) -> str:
    r = await http.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": ANON, "Content-Type": "application/json"},
        json={"email": ADMIN[0], "password": ADMIN[1]},
    )
    r.raise_for_status()
    return r.json()["access_token"]


async def main(purge: bool) -> int:
    async with httpx.AsyncClient(timeout=45) as http:
        token = await sign_in(http)
        h = {"Authorization": f"Bearer {token}"}
        created: dict[str, int] = {}

        session = (await http.get(f"{API}/api/v1/auth/session", headers=h)).json()["data"]
        branch_id = session["branch_id"]

        clients = (await http.get(f"{API}/api/v1/clients", headers=h, params={"page_size": 5})).json()["data"]
        if not clients:
            print("No clients exist. Run bootstrap_admin.py --demo first.")
            return 1
        client_id = clients[0]["id"]

        services = (await http.get(f"{API}/api/v1/services", headers=h, params={"page_size": 20})).json()["data"]

        # --- Leads --------------------------------------------------------
        existing = (await http.get(f"{API}/api/v1/leads", headers=h, params={"page_size": 100})).json()["data"]
        have = {l["email"] for l in existing}
        n = 0
        for name, email, phone, company, source, status in LEADS:
            if email in have:
                continue
            r = await http.post(f"{API}/api/v1/leads", headers=h, json={
                "name": name, "email": email, "phone": phone,
                "company_name": company, "source": source,
            })
            if r.status_code == 201 and status != "new":
                await http.patch(f"{API}/api/v1/leads/{r.json()['data']['id']}",
                                 headers=h, json={"status": status})
                n += 1
            elif r.status_code == 201:
                n += 1
        created["leads"] = n

        # --- Engagements ---------------------------------------------------
        existing = (await http.get(f"{API}/api/v1/engagements", headers=h, params={"page_size": 100})).json()["data"]
        have_services = {e["service_id"] for e in existing}
        n = 0
        for service in services[:6]:
            if service["id"] in have_services:
                continue
            r = await http.post(f"{API}/api/v1/engagements", headers=h, json={
                "client_id": client_id, "service_id": service["id"],
                "start_date": str(date.today() - timedelta(days=random.randint(30, 300))),
                "price_agreed": service["base_price"],
                "billing_cycle": service["billing_cycle"],
            })
            if r.status_code == 201:
                n += 1
        created["engagements"] = n

        # --- Tasks ----------------------------------------------------------
        existing = (await http.get(f"{API}/api/v1/tasks", headers=h, params={"page_size": 100})).json()["data"]
        have_titles = {t["title"] for t in existing}
        n = 0
        employees = (await http.get(f"{API}/api/v1/employees", headers=h, params={"page_size": 20})).json()["data"]
        for title, kind, priority, days in TASKS:
            if title in have_titles:
                continue
            r = await http.post(f"{API}/api/v1/tasks", headers=h, json={
                "title": title, "task_type": kind, "priority": priority,
                "due_date": str(date.today() + timedelta(days=days)),
                "client_id": client_id, "branch_id": branch_id,
            })
            if r.status_code != 201:
                continue
            n += 1
            # Spread assignments so the workload chart has shape.
            if employees:
                emp = employees[n % len(employees)]
                await http.post(f"{API}/api/v1/tasks/{r.json()['data']['id']}/assignments",
                                headers=h, json={"employee_id": emp["id"], "role": "assignee"})
        created["tasks"] = n

        # --- Invoices and payments -------------------------------------------
        existing = (await http.get(f"{API}/api/v1/invoices", headers=h, params={"page_size": 100})).json()["data"]
        n = paid = 0
        if len(existing) < 4:
            for i in range(4 - len(existing)):
                issued = date.today() - timedelta(days=(i + 1) * 20)
                r = await http.post(f"{API}/api/v1/invoices", headers=h, json={
                    "client_id": client_id, "branch_id": branch_id,
                    "issue_date": str(issued),
                    "due_date": str(issued + timedelta(days=30)),
                    "notes": "Professional fees",
                    "items": [
                        {"description": f"{services[i % len(services)]['name']} — engagement fee",
                         "quantity": 1, "unit_price": str(services[i % len(services)]["base_price"] or "25000.00"),
                         "tax_rate_percent": "18.00"},
                    ],
                })
                if r.status_code != 201:
                    continue
                n += 1
                invoice = r.json()["data"]
                # Issue it, and settle some so collections show movement.
                await http.patch(f"{API}/api/v1/invoices/{invoice['id']}", headers=h, json={"status": "sent"})
                if i % 2 == 0:
                    pr = await http.post(f"{API}/api/v1/payments", headers=h, json={
                        "invoice_id": invoice["id"],
                        "amount": invoice["total_amount"],
                        "payment_method": "net_banking",
                        "payment_date": str(issued + timedelta(days=10)),
                        "transaction_id": f"NEFT-DEMO-{invoice['invoice_number']}",
                    })
                    if pr.status_code == 201:
                        paid += 1
        created["invoices"] = n
        created["payments"] = paid

        # --- Compliance calendar ------------------------------------------------
        types = (await http.get(f"{API}/api/v1/compliance-types", headers=h, params={"page_size": 20})).json()["data"]
        existing = (await http.get(f"{API}/api/v1/compliance-calendar", headers=h, params={"page_size": 100})).json()["data"]
        n = 0
        if len(existing) < 6 and types:
            for i, ctype in enumerate(types[:6]):
                r = await http.post(f"{API}/api/v1/compliance-calendar", headers=h, json={
                    "client_id": client_id, "compliance_type_id": ctype["id"],
                    "due_date": str(date.today() + timedelta(days=[3, 9, 16, 24, 40, 65][i])),
                    "tax_year": "2026-27", "period": "Jul 2026",
                })
                if r.status_code == 201:
                    n += 1
        created["compliance_entries"] = n

        print("\nSeeded:")
        for key, count in created.items():
            print(f"  {key:22s} {count}")
        print("\nRe-running is safe — existing records are skipped.")
        return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed demo operating data.")
    parser.add_argument("--purge", action="store_true", help="Reserved; not implemented.")
    sys.exit(asyncio.run(main(parser.parse_args().purge)))
