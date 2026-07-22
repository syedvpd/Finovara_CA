"""Chart of accounts, journal vouchers, and bank reconciliation."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy.orm import Mapped, relationship

from app.db.base import (
    created_ts,
    AuditMixin,
    Base,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    bool_col,
    date_col,
    fk,
    int_col,
    money_col,
    str_col,
    text_col,
    ts_col,
)


class LedgerAccount(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """A node in a client's chart of accounts."""

    __tablename__ = "ledger_accounts"

    client_id: Mapped[uuid.UUID | None] = fk("clients.id", nullable=True)
    parent_id: Mapped[uuid.UUID | None] = fk("ledger_accounts.id", ondelete="RESTRICT", nullable=True)
    account_code: Mapped[str] = str_col(30)
    account_name: Mapped[str] = str_col(150)
    account_type: Mapped[str] = str_col(30)
    account_group: Mapped[str | None] = str_col(100, nullable=True)
    #: Side that increases this account — guards against sign errors in reports.
    normal_balance: Mapped[str] = str_col(10)
    is_active: Mapped[bool] = bool_col(default=True)
    opening_balance: Mapped[Decimal] = money_col()


class JournalVoucher(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """A double-entry document. Totals are kept in step by a database trigger."""

    __tablename__ = "journal_vouchers"

    client_id: Mapped[uuid.UUID] = fk("clients.id")
    branch_id: Mapped[uuid.UUID] = fk("branches.id", ondelete="RESTRICT")
    voucher_number: Mapped[str] = str_col(50, unique=True)
    voucher_type: Mapped[str] = str_col(30)
    voucher_date: Mapped[date] = date_col(nullable=False)
    narration: Mapped[str | None] = text_col()
    reference: Mapped[str | None] = str_col(100, nullable=True)
    total_debit: Mapped[Decimal] = money_col()
    total_credit: Mapped[Decimal] = money_col()
    status: Mapped[str] = str_col(30, default="draft")
    posted_at: Mapped[datetime | None] = ts_col()
    posted_by: Mapped[uuid.UUID | None] = fk("employees.id", ondelete="SET NULL", nullable=True)
    reversed_by_voucher_id: Mapped[uuid.UUID | None] = fk(
        "journal_vouchers.id", ondelete="SET NULL", nullable=True
    )

    lines: Mapped[list[JournalVoucherLine]] = relationship(
        back_populates="voucher", lazy="selectin",
        primaryjoin="JournalVoucher.id == JournalVoucherLine.voucher_id",
        order_by="JournalVoucherLine.line_number",
    )

    @property
    def is_balanced(self) -> bool:
        return self.total_debit == self.total_credit


class JournalVoucherLine(Base, UUIDPrimaryKeyMixin):
    """One leg of a voucher. Exactly one of debit/credit carries a value."""

    __tablename__ = "journal_voucher_lines"

    voucher_id: Mapped[uuid.UUID] = fk("journal_vouchers.id")
    account_id: Mapped[uuid.UUID] = fk("ledger_accounts.id", ondelete="RESTRICT")
    line_number: Mapped[int] = int_col()
    debit_amount: Mapped[Decimal] = money_col()
    credit_amount: Mapped[Decimal] = money_col()
    narration: Mapped[str | None] = text_col()
    created_at: Mapped[datetime] = created_ts()

    voucher: Mapped[JournalVoucher] = relationship(back_populates="lines", foreign_keys=[voucher_id])
    account: Mapped[LedgerAccount] = relationship(lazy="joined", foreign_keys=[account_id])


class BankTransaction(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """An imported bank statement line awaiting reconciliation."""

    __tablename__ = "bank_transactions"

    client_id: Mapped[uuid.UUID] = fk("clients.id")
    account_id: Mapped[uuid.UUID | None] = fk("ledger_accounts.id", ondelete="SET NULL", nullable=True)
    transaction_date: Mapped[date] = date_col(nullable=False)
    value_date: Mapped[date | None] = date_col()
    description: Mapped[str] = text_col(nullable=False)
    reference: Mapped[str | None] = str_col(100, nullable=True)
    debit_amount: Mapped[Decimal] = money_col()
    credit_amount: Mapped[Decimal] = money_col()
    running_balance: Mapped[Decimal | None] = money_col(nullable=True, default=None)
    #: Hash of the source row; makes re-importing a statement idempotent.
    import_hash: Mapped[str] = str_col(64)
    reconciliation_status: Mapped[str] = str_col(30, default="unreconciled")
    matched_voucher_id: Mapped[uuid.UUID | None] = fk(
        "journal_vouchers.id", ondelete="SET NULL", nullable=True
    )
    reconciled_by: Mapped[uuid.UUID | None] = fk("employees.id", ondelete="SET NULL", nullable=True)
    reconciled_at: Mapped[datetime | None] = ts_col()
