"""Prove the workers do real work against the live database.

Seeds a client, a compliance obligation falling due, and an overdue invoice;
runs the reminder and due-date engines; then asserts the right notifications
were queued and the PDF builders produce valid documents.

Runs inside a transaction that is rolled back — the database is left as found.
"""

from __future__ import annotations

import asyncio
import sys
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, text  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.models.clients import Client, ClientEntity  # noqa: E402
from app.models.content import Notification  # noqa: E402
from app.models.finance import Invoice, InvoiceItem  # noqa: E402
from app.models.operations import ComplianceCalendarEntry, ComplianceType  # noqa: E402
from app.services import pdf  # noqa: E402
from app.workers import scheduled  # noqa: E402

results: list[tuple[str, str, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append(("PASS" if ok else "FAIL", name, detail))


async def main() -> int:
    engine = create_async_engine(
        settings.sqlalchemy_url,
        connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0},
        poolclass=None,
    )
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as session:
        tx = await session.begin()
        try:
            branch_id = await session.scalar(text("select id from public.branches limit 1"))
            user_id = uuid4()

            await session.execute(
                text(
                    "insert into auth.users (id, instance_id, email, aud, role) values "
                    "(:id, '00000000-0000-0000-0000-000000000000', :email, 'authenticated', 'authenticated')"
                ),
                {"id": user_id, "email": f"worker-{user_id.hex[:8]}@example.com"},
            )

            client = Client(user_id=user_id, branch_id=branch_id, client_type="private_limited", status="active")
            session.add(client)
            await session.flush()

            session.add(ClientEntity(
                client_id=client.id, legal_name="Worker Test Pvt Ltd", entity_type="pvt_ltd",
                registered_address="Hyderabad", pan="AAACW1234F",
            ))
            await session.flush()

            # --- Reminder engine: obligation due in exactly 7 days ----------
            ctype_id = await session.scalar(
                select(ComplianceType.id).where(ComplianceType.name == "GSTR-3B Filing")
            )
            session.add(ComplianceCalendarEntry(
                client_id=client.id, compliance_type_id=ctype_id,
                due_date=date.today() + timedelta(days=7),
                status="pending", tax_year="2025-26", period="Jul 2026",
            ))
            # An obligation already past due, for the due-date engine.
            session.add(ComplianceCalendarEntry(
                client_id=client.id, compliance_type_id=ctype_id,
                due_date=date.today() - timedelta(days=3),
                status="pending", tax_year="2025-26", period="Jun 2026",
            ))
            await session.flush()

            reminders = await scheduled.queue_compliance_reminders(session)
            check("reminder engine queues due-soon notice", reminders.processed >= 1,
                  f"queued={reminders.processed}")

            queued = (await session.execute(
                select(Notification).where(Notification.recipient_id == user_id)
            )).scalars().all()
            check("notification addressed to the client user", len(queued) >= 1, f"rows={len(queued)}")
            if queued:
                body = queued[0].body
                check("template placeholders substituted",
                      "Worker Test Pvt Ltd" in body and "$client_name" not in body,
                      body.splitlines()[0][:60] if body else "")

            # Idempotency: a second pass must not duplicate.
            again = await scheduled.queue_compliance_reminders(session)
            check("reminders are idempotent", again.processed == 0, f"second_pass={again.processed}")

            overdue = await scheduled.mark_overdue_compliance(session)
            check("due-date engine flags overdue", overdue.processed >= 1, f"flagged={overdue.processed}")

            # --- Overdue invoice sweep --------------------------------------
            invoice = Invoice(
                client_id=client.id, branch_id=branch_id,
                issue_date=date.today() - timedelta(days=45),
                due_date=date.today() - timedelta(days=15),
                status="sent", subtotal=Decimal("50000.00"), tax_amount=Decimal("9000.00"),
                total_amount=Decimal("59000.00"), outstanding_amount=Decimal("59000.00"),
                paid_amount=Decimal("0.00"), discount_amount=Decimal("0.00"),
            )
            session.add(invoice)
            await session.flush()
            session.add(InvoiceItem(
                invoice_id=invoice.id, description="Statutory audit - FY 2025-26", quantity=1,
                unit_price=Decimal("50000.00"), tax_rate_percent=Decimal("18.00"),
                tax_amount=Decimal("9000.00"), total_amount=Decimal("59000.00"),
                created_at=datetime.now(timezone.utc),
            ))
            await session.flush()

            swept = await scheduled.mark_overdue_invoices(session)
            check("overdue invoice flagged", swept.processed >= 1, f"flagged={swept.processed}")
            await session.refresh(invoice)
            check("invoice status -> overdue", invoice.status == "overdue", invoice.status)
            check("overdue notice queued", swept.detail.get("notified", 0) >= 1,
                  f"notified={swept.detail.get('notified')}")

            # --- PDF generation ---------------------------------------------
            firm = {"legal_name": "Finovara Chartered Accountants LLP",
                    "registered_address": "Hyderabad", "gstin": "36AAACF1234F1Z5", "pan": "AAACF1234F"}
            items = (await session.execute(
                select(InvoiceItem).where(InvoiceItem.invoice_id == invoice.id)
            )).scalars().all()

            invoice_bytes = pdf.invoice_pdf(
                {c.name: getattr(invoice, c.name) for c in invoice.__table__.columns},
                [{c.name: getattr(i, c.name) for c in i.__table__.columns} for i in items],
                {"legal_name": "Worker Test Pvt Ltd", "registered_address": "Hyderabad",
                 "gst_number": "36AAACW1234F1Z5", "pan": "AAACW1234F", "client_code": client.client_code},
                firm,
            )
            check("invoice PDF generated", invoice_bytes.startswith(b"%PDF-") and len(invoice_bytes) > 2000,
                  f"{len(invoice_bytes)} bytes")

            payslip_bytes = pdf.payslip_pdf(
                {"attendance_days": Decimal("30.0"), "lwp_days": Decimal("0.0"),
                 "basic_salary_earned": Decimal("30000.00"), "gross_salary": Decimal("43600.00"),
                 "pf_deduction": Decimal("1800.00"), "esi_deduction": Decimal("0.00"),
                 "pt_deduction": Decimal("200.00"), "tds_deduction": Decimal("2500.00"),
                 "other_deductions": Decimal("0.00"), "net_salary": Decimal("39100.00")},
                {"employee_name": "Test Employee", "employee_code": "E-001",
                 "pan": "ABCDE1234F", "uan": "100200300400", "bank_account_no": "123456789012"},
                {"period_year": 2026, "period_month": 7}, firm,
            )
            check("payslip PDF generated", payslip_bytes.startswith(b"%PDF-") and len(payslip_bytes) > 2000,
                  f"{len(payslip_bytes)} bytes")

            report_bytes = pdf.tabular_report_pdf(
                "Compliance Statement", "Worker Test Pvt Ltd",
                ["Due date", "Obligation", "Status"],
                [["01 Aug 2026", "GSTR-3B Filing", "Pending"]], firm,
                summary=[("Total", "1")],
            )
            check("tabular report PDF generated", report_bytes.startswith(b"%PDF-"), f"{len(report_bytes)} bytes")

            xlsx = pdf.rows_to_xlsx("Compliance", ["Due", "Item"], [["2026-08-01", "GSTR-3B"]])
            check("XLSX generated", xlsx[:2] == b"PK", f"{len(xlsx)} bytes")

            csv_bytes = pdf.rows_to_csv(["Due", "Item"], [["2026-08-01", "GSTR-3B"]])
            check("CSV generated", b"GSTR-3B" in csv_bytes, f"{len(csv_bytes)} bytes")

            check("currency formatted Indian-style",
                  pdf.rupees(Decimal("1234567.89")) == "Rs. 12,34,567.89",
                  pdf.rupees(Decimal("1234567.89")))

            return 0
        finally:
            await tx.rollback()
            await engine.dispose()


if __name__ == "__main__":
    code = asyncio.run(main())
    width = max(len(n) for _, n, _ in results) + 2
    print(f"\n{'RESULT':<7} {'CHECK':<{width}} DETAIL")
    print("-" * (width + 40))
    for status, name, detail in results:
        print(f"{status:<7} {name:<{width}} {detail}")
    failed = sum(1 for s, _, _ in results if s == "FAIL")
    print(f"\n{len(results) - failed}/{len(results)} passed. Rolled back — database unchanged.")
    sys.exit(1 if failed else code)
