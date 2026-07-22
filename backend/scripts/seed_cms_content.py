"""Publish starter articles and vacancies through the API.

The blog and careers pages fall back to hard-coded copy when the CMS is empty,
which hides the fact that nothing is actually published — article links have no
slug to open and vacancies have no id to apply against.

This seeds a small set through the same endpoints the admin panels use, so the
firm can edit or delete any of it from Blog Management and Careers Management.
Re-running it skips anything already present.
"""

import asyncio
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv(".env")

API = os.environ.get("E2E_API", "http://localhost:8000")
ADMIN = (
    os.environ.get("SEED_ADMIN_EMAIL", "admin@finovara.demo"),
    os.environ.get("SEED_ADMIN_PASSWORD", "Finovara@Admin2026"),
)

ARTICLES = [
    {
        "title": "Budget 2025: Key Changes Affecting Indian Businesses",
        "slug": "budget-2025-key-changes",
        "summary": "A breakdown of the Union Budget announcements affecting corporate tax, "
        "capital gains and startup incentives.",
        "content": (
            "The Union Budget carries several measures that change how growing businesses plan "
            "their tax position for the year ahead.\n\n"
            "Corporate tax rates remain unchanged for domestic companies, but the compliance "
            "calendar tightens: several filings move earlier in the quarter, and the window for "
            "revising returns narrows. Businesses that file close to the deadline should plan for "
            "the earlier dates now rather than discover them in the filing month.\n\n"
            "Capital gains treatment has been simplified across asset classes. The practical "
            "effect for most closely held companies is that holding periods now need to be "
            "tracked more carefully, because the distinction between short and long term drives a "
            "materially different rate.\n\n"
            "Startup incentives have been extended, with the eligibility window pushed out. "
            "Companies incorporated within the extended period should confirm their recognition "
            "status before claiming the deduction, since the claim depends on it.\n\n"
            "If any of this affects a decision you are about to take, speak to your engagement "
            "partner before acting. The summary above is general information, not advice on your "
            "circumstances."
        ),
        "status": "published",
    },
    {
        "title": "New GST Return Filing Mechanism: What You Need to Know",
        "slug": "new-gst-return-filing-mechanism",
        "summary": "Understanding the revised GST filing procedures and how businesses should "
        "prepare for the updated compliance framework.",
        "content": (
            "The revised return mechanism changes the sequence in which outward and inward "
            "supplies are reported, and it reduces the room to correct a return after filing.\n\n"
            "The most significant practical change is reconciliation timing. Input tax credit now "
            "depends more tightly on what suppliers have actually filed, so a supplier who files "
            "late directly delays your credit. Businesses with many small suppliers should build a "
            "monthly follow-up routine rather than reconciling at the year end.\n\n"
            "E-invoicing thresholds continue to widen. Companies approaching the turnover limit "
            "should test their billing system well before they cross it, because retrofitting "
            "e-invoicing mid-year is considerably harder than preparing for it.\n\n"
            "Our GST team runs a monthly reconciliation for clients on the compliance retainer, "
            "including supplier follow-up and a credit-at-risk report."
        ),
        "status": "published",
    },
    {
        "title": "Virtual CFO vs In-House CFO: The Decision Guide",
        "slug": "virtual-cfo-vs-in-house-cfo",
        "summary": "A cost-benefit analysis helping growing businesses decide between hiring "
        "full-time financial leadership or outsourcing it.",
        "content": (
            "The question is rarely about capability. It is about how much senior financial "
            "attention a business genuinely needs each month, and how predictable that need is.\n\n"
            "A full-time CFO makes sense once the finance function is large enough that the role "
            "is managing people and systems daily: multiple entities, a treasury position worth "
            "actively managing, or an imminent fundraise or transaction.\n\n"
            "A virtual CFO fits businesses that need the judgement without the volume — monthly "
            "MIS review, cash-flow planning, board reporting and the occasional decision that "
            "warrants a senior view. The cost sits well below a full-time hire, and the engagement "
            "can scale up around a specific event.\n\n"
            "The failure mode to avoid is the middle: hiring a full-time CFO for a business that "
            "needs four days a month, then under-using the role until it becomes bookkeeping.\n\n"
            "We run virtual CFO engagements across both models and can advise on the transition "
            "point specific to your growth stage."
        ),
        "status": "published",
    },
]

VACANCIES = [
    {
        "job_title": "Chartered Accountant — Audit & Assurance",
        "department": "Audit",
        "location": "Hyderabad",
        "description": "Lead statutory and internal audit engagements for clients across "
        "manufacturing, IT and healthcare, supported by a partner review at every stage.",
        "requirements": "Qualified CA with 0-3 years of post-qualification experience. Strong "
        "grounding in Ind AS and the Companies Act. Willingness to travel to client sites.",
        "status": "open",
    },
    {
        "job_title": "GST Consultant",
        "department": "Indirect Tax",
        "location": "Bengaluru",
        "description": "Own the GST compliance cycle for a portfolio of clients: registrations, "
        "monthly returns, reconciliation and notice handling.",
        "requirements": "CA Inter or equivalent with 2+ years in indirect tax. Comfortable with "
        "the GST portal and reconciliation tooling. Clear written communication with clients.",
        "status": "open",
    },
    {
        "job_title": "Payroll Executive",
        "department": "Payroll",
        "location": "Hyderabad",
        "description": "Run monthly payroll for client organisations, including statutory "
        "deductions, payslip generation and PF/ESI filings.",
        "requirements": "Graduate with 1-3 years of payroll experience. Working knowledge of PF, "
        "ESI and professional tax. Accuracy under a fixed monthly deadline.",
        "status": "open",
    },
]


async def main() -> int:
    async with httpx.AsyncClient(base_url=API, timeout=60) as http:
        supabase = os.environ["SUPABASE_URL"].rstrip("/")
        token_response = await http.post(
            f"{supabase}/auth/v1/token?grant_type=password",
            headers={"apikey": os.environ["SUPABASE_ANON_KEY"]},
            json={"email": ADMIN[0], "password": ADMIN[1]},
        )
        if token_response.status_code != 200:
            print(f"Could not sign in as {ADMIN[0]}: {token_response.text[:200]}")
            return 1
        headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}

        existing_slugs = {
            b["slug"] for b in (await http.get("/api/v1/public/blogs", params={"limit": 50})).json()["data"]
        }
        for article in ARTICLES:
            if article["slug"] in existing_slugs:
                print(f"  skip   {article['slug']}")
                continue
            # `status` is assigned by the server on create, so publishing is a
            # second step — the same split the admin forms follow.
            body = {k: v for k, v in article.items() if k != "status"}
            r = await http.post("/api/v1/blogs", json=body, headers=headers)
            if r.is_success:
                new_id = r.json()["data"]["id"]
                r = await http.patch(
                    f"/api/v1/blogs/{new_id}", json={"status": "published"}, headers=headers
                )
            print(f"  {'ok    ' if r.is_success else 'FAILED'} {article['slug']} ({r.status_code})")
            if not r.is_success:
                print(f"         {r.text[:200]}")

        existing_titles = {
            c["job_title"] for c in (await http.get("/api/v1/public/careers")).json()["data"]
        }
        for vacancy in VACANCIES:
            if vacancy["job_title"] in existing_titles:
                print(f"  skip   {vacancy['job_title']}")
                continue
            body = {k: v for k, v in vacancy.items() if k != "status"}
            r = await http.post("/api/v1/careers", json=body, headers=headers)
            if r.is_success and vacancy["status"] != r.json()["data"].get("status"):
                r = await http.patch(
                    f"/api/v1/careers/{r.json()['data']['id']}",
                    json={"status": vacancy["status"]}, headers=headers,
                )
            print(f"  {'ok    ' if r.is_success else 'FAILED'} {vacancy['job_title']} ({r.status_code})")
            if not r.is_success:
                print(f"         {r.text[:200]}")

        blogs = (await http.get("/api/v1/public/blogs", params={"limit": 50})).json()["data"]
        careers = (await http.get("/api/v1/public/careers")).json()["data"]
        print(f"\npublished articles: {len(blogs)}   open vacancies: {len(careers)}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
