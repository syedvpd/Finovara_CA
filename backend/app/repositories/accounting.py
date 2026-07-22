"""Repositories for the chart of accounts, vouchers, and bank reconciliation."""

from __future__ import annotations

import hashlib
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select

from app.models.accounting import BankTransaction, JournalVoucher, JournalVoucherLine, LedgerAccount
from app.repositories.base import BaseRepository


class LedgerAccountRepository(BaseRepository[LedgerAccount]):
    model = LedgerAccount
    searchable_fields = ("account_code", "account_name", "account_group")
    sortable_fields = ("account_code", "account_name", "account_type", "created_at")
    default_sort = "account_code"
    client_column = "client_id"

    async def code_taken(
        self, client_id: UUID | None, code: str, *, exclude_id: UUID | None = None
    ) -> bool:
        stmt = self.base_query().where(
            LedgerAccount.client_id.is_not_distinct_from(client_id),
            LedgerAccount.account_code == code,
        )
        if exclude_id:
            stmt = stmt.where(LedgerAccount.id != exclude_id)
        return (await self.session.execute(stmt)).scalars().first() is not None

    async def has_postings(self, account_id: UUID) -> bool:
        stmt = select(JournalVoucherLine.id).where(JournalVoucherLine.account_id == account_id).limit(1)
        return (await self.session.execute(stmt)).first() is not None


class JournalVoucherRepository(BaseRepository[JournalVoucher]):
    model = JournalVoucher
    searchable_fields = ("voucher_number", "narration", "reference")
    sortable_fields = ("voucher_date", "voucher_number", "status", "created_at")
    default_sort = "voucher_date"
    client_column = "client_id"
    branch_column = "branch_id"

    async def trial_balance(self, client_id: UUID, as_of: date) -> list[dict]:
        """Posted debits and credits per account, up to a date.

        Draft and reversed vouchers are excluded: only posted entries form part
        of the books.
        """
        stmt = (
            select(
                LedgerAccount.id,
                LedgerAccount.account_code,
                LedgerAccount.account_name,
                LedgerAccount.account_type,
                LedgerAccount.normal_balance,
                LedgerAccount.opening_balance,
                func.coalesce(func.sum(JournalVoucherLine.debit_amount), 0).label("debit_total"),
                func.coalesce(func.sum(JournalVoucherLine.credit_amount), 0).label("credit_total"),
            )
            .select_from(LedgerAccount)
            .outerjoin(JournalVoucherLine, JournalVoucherLine.account_id == LedgerAccount.id)
            .outerjoin(
                JournalVoucher,
                (JournalVoucher.id == JournalVoucherLine.voucher_id)
                & (JournalVoucher.status == "posted")
                & (JournalVoucher.voucher_date <= as_of)
                & (JournalVoucher.deleted_at.is_(None)),
            )
            .where(LedgerAccount.client_id == client_id, LedgerAccount.deleted_at.is_(None))
            .group_by(
                LedgerAccount.id,
                LedgerAccount.account_code,
                LedgerAccount.account_name,
                LedgerAccount.account_type,
                LedgerAccount.normal_balance,
                LedgerAccount.opening_balance,
            )
            .order_by(LedgerAccount.account_code)
        )

        rows = []
        for row in (await self.session.execute(stmt)).all():
            debit, credit = Decimal(row.debit_total), Decimal(row.credit_total)
            opening = Decimal(row.opening_balance)
            # Closing balance is expressed on the account's normal side.
            movement = debit - credit if row.normal_balance == "debit" else credit - debit
            rows.append(
                {
                    "account_id": row.id,
                    "account_code": row.account_code,
                    "account_name": row.account_name,
                    "account_type": row.account_type,
                    "debit_total": debit,
                    "credit_total": credit,
                    "closing_balance": opening + movement,
                }
            )
        return rows


class BankTransactionRepository(BaseRepository[BankTransaction]):
    model = BankTransaction
    searchable_fields = ("description", "reference")
    sortable_fields = ("transaction_date", "reconciliation_status", "created_at")
    default_sort = "transaction_date"
    client_column = "client_id"

    @staticmethod
    def import_hash(client_id: UUID, row: dict) -> str:
        """Stable fingerprint of a statement line.

        Lets the same statement be re-uploaded without duplicating rows, which
        would otherwise corrupt the reconciliation.
        """
        parts = "|".join(
            str(part)
            for part in (
                client_id,
                row["transaction_date"],
                row["description"].strip().lower(),
                row.get("debit_amount", 0),
                row.get("credit_amount", 0),
                (row.get("reference") or "").strip().lower(),
            )
        )
        return hashlib.sha256(parts.encode("utf-8")).hexdigest()

    async def hash_exists(self, client_id: UUID, import_hash: str) -> bool:
        stmt = select(BankTransaction.id).where(
            BankTransaction.client_id == client_id, BankTransaction.import_hash == import_hash
        ).limit(1)
        return (await self.session.execute(stmt)).first() is not None

    async def unreconciled(self, client_id: UUID) -> list[BankTransaction]:
        stmt = (
            self.base_query()
            .where(
                BankTransaction.client_id == client_id,
                BankTransaction.reconciliation_status == "unreconciled",
            )
            .order_by(BankTransaction.transaction_date)
        )
        return list((await self.session.execute(stmt)).scalars().all())
