"""Schemas for the chart of accounts, journal vouchers, and reconciliation."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import Field, model_validator

from app.schemas.common import APIModel

Money = Annotated[Decimal, Field(ge=0, max_digits=15, decimal_places=2)]

ACCOUNT_TYPES = ("asset", "liability", "equity", "income", "expense")
VOUCHER_TYPES = (
    "journal", "payment", "receipt", "contra", "sales", "purchase", "credit_note", "debit_note",
)

#: The side that increases each account type. Used to default normal_balance so
#: a mis-set sign cannot silently invert a financial statement.
NORMAL_BALANCE_BY_TYPE = {
    "asset": "debit",
    "expense": "debit",
    "liability": "credit",
    "equity": "credit",
    "income": "credit",
}


class LedgerAccountRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID | None = None
    parent_id: uuid.UUID | None = None
    account_code: str
    account_name: str
    account_type: str
    account_group: str | None = None
    normal_balance: str
    is_active: bool
    opening_balance: Decimal
    created_at: datetime


class LedgerAccountCreate(APIModel):
    account_code: Annotated[str, Field(min_length=1, max_length=30)]
    account_name: Annotated[str, Field(min_length=2, max_length=150)]
    account_type: Annotated[str, Field(pattern="^(" + "|".join(ACCOUNT_TYPES) + ")$")]
    client_id: uuid.UUID | None = None
    parent_id: uuid.UUID | None = None
    account_group: Annotated[str, Field(max_length=100)] | None = None
    normal_balance: Annotated[str, Field(pattern="^(debit|credit)$")] | None = None
    opening_balance: Money = Decimal("0.00")

    @model_validator(mode="after")
    def _default_normal_balance(self) -> LedgerAccountCreate:
        expected = NORMAL_BALANCE_BY_TYPE[self.account_type]
        if self.normal_balance is None:
            object.__setattr__(self, "normal_balance", expected)
        elif self.normal_balance != expected:
            raise ValueError(
                f"A {self.account_type} account normally carries a {expected} balance."
            )
        return self


class LedgerAccountUpdate(APIModel):
    account_name: Annotated[str, Field(min_length=2, max_length=150)] | None = None
    account_group: Annotated[str, Field(max_length=100)] | None = None
    is_active: bool | None = None


class VoucherLineCreate(APIModel):
    account_id: uuid.UUID
    debit_amount: Money = Decimal("0.00")
    credit_amount: Money = Decimal("0.00")
    narration: str | None = None

    @model_validator(mode="after")
    def _exactly_one_side(self) -> VoucherLineCreate:
        debit, credit = self.debit_amount, self.credit_amount
        if (debit > 0) == (credit > 0):
            raise ValueError("Each line must carry either a debit or a credit, not both or neither.")
        return self


class VoucherLineRead(APIModel):
    id: uuid.UUID
    voucher_id: uuid.UUID
    account_id: uuid.UUID
    line_number: int
    debit_amount: Decimal
    credit_amount: Decimal
    narration: str | None = None


class JournalVoucherRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID
    branch_id: uuid.UUID
    voucher_number: str
    voucher_type: str
    voucher_date: date
    narration: str | None = None
    reference: str | None = None
    total_debit: Decimal
    total_credit: Decimal
    status: str
    posted_at: datetime | None = None
    created_at: datetime
    lines: list[VoucherLineRead] = Field(default_factory=list)


class JournalVoucherCreate(APIModel):
    client_id: uuid.UUID
    branch_id: uuid.UUID
    voucher_type: Annotated[str, Field(pattern="^(" + "|".join(VOUCHER_TYPES) + ")$")]
    lines: Annotated[list[VoucherLineCreate], Field(min_length=2, max_length=200)]
    voucher_date: date | None = None
    narration: str | None = None
    reference: Annotated[str, Field(max_length=100)] | None = None

    @model_validator(mode="after")
    def _must_balance(self) -> JournalVoucherCreate:
        debits = sum(line.debit_amount for line in self.lines)
        credits = sum(line.credit_amount for line in self.lines)
        if debits != credits:
            raise ValueError(f"The voucher does not balance: debits {debits} vs credits {credits}.")
        if debits == 0:
            raise ValueError("A voucher cannot be for a zero amount.")
        return self


class JournalVoucherUpdate(APIModel):
    narration: str | None = None
    reference: Annotated[str, Field(max_length=100)] | None = None
    voucher_date: date | None = None
    status: Annotated[str, Field(pattern="^(draft|posted|reversed)$")] | None = None


class BankTransactionRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID
    account_id: uuid.UUID | None = None
    transaction_date: date
    value_date: date | None = None
    description: str
    reference: str | None = None
    debit_amount: Decimal
    credit_amount: Decimal
    running_balance: Decimal | None = None
    reconciliation_status: str
    matched_voucher_id: uuid.UUID | None = None
    reconciled_at: datetime | None = None
    created_at: datetime


class BankTransactionImportRow(APIModel):
    transaction_date: date
    description: Annotated[str, Field(min_length=1)]
    debit_amount: Money = Decimal("0.00")
    credit_amount: Money = Decimal("0.00")
    value_date: date | None = None
    reference: Annotated[str, Field(max_length=100)] | None = None
    running_balance: Decimal | None = None

    @model_validator(mode="after")
    def _exactly_one_side(self) -> BankTransactionImportRow:
        if (self.debit_amount > 0) == (self.credit_amount > 0):
            raise ValueError("A statement line must be either a debit or a credit.")
        return self


class BankStatementImport(APIModel):
    client_id: uuid.UUID
    account_id: uuid.UUID | None = None
    rows: Annotated[list[BankTransactionImportRow], Field(min_length=1, max_length=2000)]


class BankMatchRequest(APIModel):
    voucher_id: uuid.UUID


class TrialBalanceRow(APIModel):
    account_id: uuid.UUID
    account_code: str
    account_name: str
    account_type: str
    debit_total: Decimal
    credit_total: Decimal
    closing_balance: Decimal


class TrialBalance(APIModel):
    client_id: uuid.UUID
    as_of: date
    rows: list[TrialBalanceRow]
    total_debit: Decimal
    total_credit: Decimal
    is_balanced: bool
