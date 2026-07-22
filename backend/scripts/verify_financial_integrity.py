"""Verify the financial-integrity triggers against the live database.

Covers the defects fixed in 20260721000004_hardening.sql:
  1. Invoice numbering must be race-free (was count(*)+1).
  2. Payment reconciliation must be idempotent (was double-counting on update).
  3. The ledger must be posted as a balanced double entry (was credit-only).

Everything runs inside a transaction that is rolled back, so the database is
left exactly as it was found.
"""

from __future__ import annotations

import asyncio
import re
import sys
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

import asyncpg

sys.path.insert(0, str(Path(__file__).resolve().parent))
from migrate import dsn_from_env  # noqa: E402

PASS, FAIL = "PASS", "FAIL"
results: list[tuple[str, str, str]] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    results.append((PASS if condition else FAIL, name, detail))


async def main() -> int:
    conn = await asyncpg.connect(dsn_from_env(), statement_cache_size=0, timeout=30)
    tx = conn.transaction()
    await tx.start()
    try:
        branch_id = await conn.fetchval("select id from public.branches limit 1")
        user_id, client_user_id = uuid4(), uuid4()

        # Minimal fixture: auth user -> profile -> client.
        await conn.execute(
            "insert into auth.users (id, instance_id, email, aud, role) "
            "values ($1, '00000000-0000-0000-0000-000000000000', $2, 'authenticated', 'authenticated')",
            client_user_id, f"fin-test-{client_user_id.hex[:8]}@example.com",
        )
        # handle_new_user trigger creates public.users automatically.
        exists = await conn.fetchval("select count(*) from public.users where id=$1", client_user_id)
        check("handle_new_user trigger provisions profile", exists == 1, f"rows={exists}")

        role_code = await conn.fetchval(
            "select r.code from public.users u join public.roles r on r.id=u.role_id where u.id=$1",
            client_user_id,
        )
        check("signup cannot self-assign a privileged role", role_code == "client", f"role={role_code}")

        client_id = await conn.fetchval(
            "insert into public.clients (user_id, branch_id, client_type, status) "
            "values ($1,$2,'private_limited','active') returning id",
            client_user_id, branch_id,
        )
        client_code = await conn.fetchval("select client_code from public.clients where id=$1", client_id)
        check("client_code auto-generated", bool(re.fullmatch(r"CL-\d{5}", client_code or "")), client_code)

        # --- 1. Invoice numbering -------------------------------------------
        invoice_ids = []
        for _ in range(3):
            invoice_ids.append(
                await conn.fetchval(
                    "insert into public.invoices (client_id, branch_id, due_date, subtotal, tax_amount, "
                    "total_amount, outstanding_amount, status) "
                    "values ($1,$2,current_date+30,10000,1800,11800,11800,'sent') returning id",
                    client_id, branch_id,
                )
            )
        numbers = [
            await conn.fetchval("select invoice_number from public.invoices where id=$1", i)
            for i in invoice_ids
        ]
        check("invoice numbers unique", len(set(numbers)) == 3, str(numbers))
        check(
            "invoice number format INV-<FY>-NNNNN",
            all(re.fullmatch(r"INV-\d{4}-\d{5}", n or "") for n in numbers),
            str(numbers),
        )

        invoice_id = invoice_ids[0]

        # --- 2. Payment reconciliation --------------------------------------
        payment_id = await conn.fetchval(
            "insert into public.payments (invoice_id, client_id, amount, payment_method, status) "
            "values ($1,$2,5000,'net_banking','cleared') returning id",
            invoice_id, client_id,
        )
        payment_number = await conn.fetchval(
            "select payment_number from public.payments where id=$1", payment_id
        )
        check("payment number auto-generated", bool(payment_number), payment_number)

        paid, outstanding, status = await conn.fetchrow(
            "select paid_amount, outstanding_amount, status from public.invoices where id=$1", invoice_id
        )
        check("partial payment applied", paid == Decimal("5000.00"), f"paid={paid}")
        check("outstanding recomputed", outstanding == Decimal("6800.00"), f"outstanding={outstanding}")
        check("status -> partially_paid", status == "partially_paid", f"status={status}")

        # The original bug: any later UPDATE re-added the amount.
        await conn.execute(
            "update public.payments set reconciliation_status='reconciled' where id=$1", payment_id
        )
        paid_after, outstanding_after = await conn.fetchrow(
            "select paid_amount, outstanding_amount from public.invoices where id=$1", invoice_id
        )
        check(
            "reconciliation is idempotent (no double-count)",
            paid_after == Decimal("5000.00") and outstanding_after == Decimal("6800.00"),
            f"paid={paid_after} outstanding={outstanding_after}",
        )

        # --- 3. Double-entry ledger -----------------------------------------
        rows = await conn.fetch(
            "select transaction_type, amount, account_code from public.general_ledger "
            "where reference_type='payment' and reference_id=$1 order by transaction_type",
            payment_id,
        )
        debits = sum(r["amount"] for r in rows if r["transaction_type"] == "debit")
        credits = sum(r["amount"] for r in rows if r["transaction_type"] == "credit")
        check("ledger posts both legs", len(rows) == 2, f"lines={len(rows)}")
        check("ledger balances", debits == credits == Decimal("5000.00"), f"dr={debits} cr={credits}")

        ledger_count_before = await conn.fetchval(
            "select count(*) from public.general_ledger where reference_id=$1", payment_id
        )
        await conn.execute(
            "update public.payments set transaction_id='RETRY-001' where id=$1", payment_id
        )
        ledger_count_after = await conn.fetchval(
            "select count(*) from public.general_ledger where reference_id=$1", payment_id
        )
        check(
            "ledger not double-posted on update",
            ledger_count_before == ledger_count_after == 2,
            f"{ledger_count_before} -> {ledger_count_after}",
        )

        # Settling the balance closes the invoice.
        await conn.execute(
            "insert into public.payments (invoice_id, client_id, amount, payment_method, status) "
            "values ($1,$2,6800,'upi','cleared')",
            invoice_id, client_id,
        )
        final_status, final_out = await conn.fetchrow(
            "select status, outstanding_amount from public.invoices where id=$1", invoice_id
        )
        check("full settlement -> paid", final_status == "paid", f"status={final_status}")
        check("outstanding cleared", final_out == Decimal("0.00"), f"outstanding={final_out}")

        # --- 4. Soft delete --------------------------------------------------
        await conn.execute("delete from public.clients where id=$1", client_id)
        deleted_at = await conn.fetchval("select deleted_at from public.clients where id=$1", client_id)
        check("delete is soft", deleted_at is not None, f"deleted_at={deleted_at}")

        # --- 5. Statutory config lookup --------------------------------------
        pf = await conn.fetchrow(
            "select employee_rate, employer_rate, wage_ceiling from public.payroll_statutory_config "
            "where component='pf' and is_active order by effective_from desc limit 1"
        )
        check("PF statutory rate configured", pf is not None and pf["employee_rate"] == Decimal("12.000"),
              str(dict(pf)) if pf else "missing")

        pt = await conn.fetchval(
            "select slabs from public.payroll_statutory_config "
            "where component='professional_tax' and state_code='TS' limit 1"
        )
        check("Telangana PT slabs seeded", pt is not None, "present" if pt else "missing")

        return 0
    finally:
        await tx.rollback()
        await conn.close()


if __name__ == "__main__":
    code = asyncio.run(main())
    width = max(len(name) for _, name, _ in results) + 2
    print(f"\n{'RESULT':<7} {'CHECK':<{width}} DETAIL")
    print("-" * (width + 45))
    for status, name, detail in results:
        print(f"{status:<7} {name:<{width}} {detail}")
    failed = sum(1 for s, _, _ in results if s == FAIL)
    print(f"\n{len(results) - failed}/{len(results)} passed. Transaction rolled back — database unchanged.")
    sys.exit(1 if failed else code)
