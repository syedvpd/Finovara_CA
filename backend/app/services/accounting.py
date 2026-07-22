"""Double-entry accounting: chart of accounts, vouchers, and reconciliation."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import VOUCHER_TRANSITIONS
from app.core.exceptions import (
    AlreadyExistsError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.core.logging import get_logger
from app.core.permissions import Action, Module
from app.core.security import AuthContext
from app.models.accounting import BankTransaction, JournalVoucher, JournalVoucherLine, LedgerAccount
from app.repositories.accounting import (
    BankTransactionRepository,
    JournalVoucherRepository,
    LedgerAccountRepository,
)
from app.repositories.clients import ClientRepository
from app.repositories.identity import BranchRepository
from app.services.base import BaseService
from app.utils.money import ZERO, money

logger = get_logger(__name__)


class LedgerAccountService(BaseService[LedgerAccount, LedgerAccountRepository]):
    module = Module.ACCOUNTING

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if client_id := data.get("client_id"):
            if await ClientRepository(self.repo.session).get(client_id) is None:
                raise NotFoundError("Client", client_id)

        if await self.repo.code_taken(data.get("client_id"), data["account_code"]):
            raise AlreadyExistsError("That account code is already in use for this client.")

        if parent_id := data.get("parent_id"):
            parent = await self.repo.get(parent_id)
            if parent is None:
                raise NotFoundError("Parent account", parent_id)
            if parent.account_type != data["account_type"]:
                raise ValidationError("A sub-account must share its parent's account type.")
        return data

    async def _before_delete(self, entity: LedgerAccount, auth: AuthContext) -> None:
        # Removing an account that carries postings would orphan the ledger.
        if await self.repo.has_postings(entity.id):
            raise ConflictError(
                "This account has journal postings and cannot be removed. Deactivate it instead."
            )


class JournalVoucherService(BaseService[JournalVoucher, JournalVoucherRepository]):
    module = Module.ACCOUNTING
    transitions = VOUCHER_TRANSITIONS

    async def create_with_lines(self, payload: dict[str, Any], auth: AuthContext) -> JournalVoucher:
        """Create a balanced voucher and its lines in one transaction."""
        self._require(auth, Action.CREATE)
        session = self.repo.session

        if await ClientRepository(session).get(payload["client_id"]) is None:
            raise NotFoundError("Client", payload["client_id"])
        if await BranchRepository(session).get(payload["branch_id"]) is None:
            raise NotFoundError("Branch", payload["branch_id"])

        lines = payload["lines"]
        account_repo = LedgerAccountRepository(session)

        debits = ZERO
        credits = ZERO
        for line in lines:
            account = await account_repo.get(line["account_id"])
            if account is None:
                raise NotFoundError("Ledger account", line["account_id"])
            if not account.is_active:
                raise ValidationError(f"Account '{account.account_code}' is inactive.")
            if account.client_id is not None and account.client_id != payload["client_id"]:
                raise ValidationError(
                    f"Account '{account.account_code}' belongs to a different client."
                )
            debits += money(line.get("debit_amount", 0))
            credits += money(line.get("credit_amount", 0))

        # Re-checked server-side even though the schema validates it: the
        # invariant is what makes the books trustworthy.
        if debits != credits:
            raise ValidationError(
                "The voucher does not balance.",
                details={"total_debit": str(debits), "total_credit": str(credits)},
            )

        voucher = await self.repo.create(
            {
                "client_id": payload["client_id"],
                "branch_id": payload["branch_id"],
                "voucher_type": payload["voucher_type"],
                "voucher_date": payload.get("voucher_date") or date.today(),
                "narration": payload.get("narration"),
                "reference": payload.get("reference"),
                "status": "draft",
            },
            actor_id=auth.user_id,
        )

        session.add_all(
            JournalVoucherLine(
                voucher_id=voucher.id,
                account_id=line["account_id"],
                line_number=index,
                debit_amount=money(line.get("debit_amount", 0)),
                credit_amount=money(line.get("credit_amount", 0)),
                narration=line.get("narration"),
                created_at=datetime.now(timezone.utc),
            )
            for index, line in enumerate(lines, start=1)
        )
        await session.flush()
        await session.refresh(voucher)
        return voucher

    async def _before_update(
        self, entity: JournalVoucher, data: dict[str, Any], auth: AuthContext
    ) -> dict[str, Any]:
        if entity.status == "posted" and set(data) - {"status", "narration"}:
            raise ConflictError("A posted voucher cannot be edited. Reverse it and raise a new one.")
        if entity.status == "reversed":
            raise ConflictError("A reversed voucher is immutable.")

        if data.get("status") == "posted":
            if entity.total_debit != entity.total_credit:
                raise ConflictError(
                    "The voucher does not balance and cannot be posted.",
                    details={
                        "total_debit": str(entity.total_debit),
                        "total_credit": str(entity.total_credit),
                    },
                )
            if entity.total_debit == ZERO:
                raise ConflictError("A voucher with no value cannot be posted.")
            data["posted_at"] = datetime.now(timezone.utc)
            if auth.employee_id:
                data["posted_by"] = auth.employee_id

        return data

    async def reverse(self, voucher_id: UUID, auth: AuthContext) -> JournalVoucher:
        """Post a mirror-image voucher.

        Accounting entries are never deleted or edited after posting; a
        correction is itself an entry, which preserves the audit trail.
        """
        self._require(auth, Action.UPDATE)
        original = await self.repo.get_scoped_or_404(voucher_id, auth)

        if original.status != "posted":
            raise ConflictError("Only a posted voucher can be reversed.")
        if original.reversed_by_voucher_id is not None:
            raise ConflictError("This voucher has already been reversed.")

        session = self.repo.session
        reversal = await self.repo.create(
            {
                "client_id": original.client_id,
                "branch_id": original.branch_id,
                "voucher_type": original.voucher_type,
                "voucher_date": date.today(),
                "narration": f"Reversal of {original.voucher_number}",
                "reference": original.voucher_number,
                "status": "draft",
            },
            actor_id=auth.user_id,
        )

        session.add_all(
            JournalVoucherLine(
                voucher_id=reversal.id,
                account_id=line.account_id,
                line_number=line.line_number,
                # Sides are swapped: that is what makes it a reversal.
                debit_amount=line.credit_amount,
                credit_amount=line.debit_amount,
                narration=f"Reversal: {line.narration or ''}".strip(),
                created_at=datetime.now(timezone.utc),
            )
            for line in original.lines
        )
        await session.flush()

        await self.repo.update(
            reversal,
            {"status": "posted", "posted_at": datetime.now(timezone.utc), "posted_by": auth.employee_id},
            actor_id=auth.user_id,
        )
        await self.repo.update(
            original,
            {"status": "reversed", "reversed_by_voucher_id": reversal.id},
            actor_id=auth.user_id,
        )

        logger.info("voucher_reversed", original=str(original.id), reversal=str(reversal.id))
        return reversal

    async def trial_balance(
        self, client_id: UUID, auth: AuthContext, *, as_of: date | None = None
    ) -> dict[str, Any]:
        self._require(auth, Action.READ)
        if auth.is_client and client_id != auth.client_id:
            raise ForbiddenError("You may only access your own records.")

        as_of = as_of or date.today()
        rows = await self.repo.trial_balance(client_id, as_of)

        total_debit = sum((Decimal(r["debit_total"]) for r in rows), ZERO)
        total_credit = sum((Decimal(r["credit_total"]) for r in rows), ZERO)

        return {
            "client_id": client_id,
            "as_of": as_of,
            "rows": rows,
            "total_debit": money(total_debit),
            "total_credit": money(total_credit),
            "is_balanced": money(total_debit) == money(total_credit),
        }


class BankReconciliationService(BaseService[BankTransaction, BankTransactionRepository]):
    module = Module.ACCOUNTING

    async def import_statement(self, payload: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        """Import statement lines, skipping any already present.

        Deduplication is by content hash, so re-uploading the same statement is
        harmless rather than double-counting the bank balance.
        """
        self._require(auth, Action.CREATE)

        client_id = payload["client_id"]
        if await ClientRepository(self.repo.session).get(client_id) is None:
            raise NotFoundError("Client", client_id)

        imported = 0
        skipped = 0
        errors: list[dict[str, Any]] = []

        for index, row in enumerate(payload["rows"]):
            fingerprint = self.repo.import_hash(client_id, row)
            if await self.repo.hash_exists(client_id, fingerprint):
                skipped += 1
                continue

            try:
                await self.repo.create(
                    {
                        "client_id": client_id,
                        "account_id": payload.get("account_id"),
                        "transaction_date": row["transaction_date"],
                        "value_date": row.get("value_date"),
                        "description": row["description"],
                        "reference": row.get("reference"),
                        "debit_amount": money(row.get("debit_amount", 0)),
                        "credit_amount": money(row.get("credit_amount", 0)),
                        "running_balance": row.get("running_balance"),
                        "import_hash": fingerprint,
                        "reconciliation_status": "unreconciled",
                    },
                    actor_id=auth.user_id,
                )
                imported += 1
            except Exception as exc:  # noqa: BLE001 - one bad row must not fail the batch
                errors.append({"index": index, "error": str(exc)[:200]})

        logger.info(
            "bank_statement_imported",
            client_id=str(client_id), imported=imported, skipped=skipped, failed=len(errors),
        )
        return {
            "requested": len(payload["rows"]),
            "succeeded": imported,
            "failed": len(errors),
            "errors": errors + ([{"skipped_duplicates": skipped}] if skipped else []),
        }

    async def match(self, transaction_id: UUID, voucher_id: UUID, auth: AuthContext) -> BankTransaction:
        """Tie a statement line to a posted voucher."""
        self._require(auth, Action.UPDATE)

        transaction = await self.repo.get_scoped_or_404(transaction_id, auth)
        if transaction.reconciliation_status == "matched":
            raise ConflictError("This transaction is already matched.")

        voucher = await JournalVoucherRepository(self.repo.session).get(voucher_id)
        if voucher is None:
            raise NotFoundError("Voucher", voucher_id)
        if voucher.client_id != transaction.client_id:
            raise ValidationError("That voucher belongs to a different client.")
        if voucher.status != "posted":
            raise ConflictError("Only a posted voucher can be matched to a bank line.")

        statement_amount = transaction.debit_amount or transaction.credit_amount
        if money(voucher.total_debit) != money(statement_amount):
            raise ValidationError(
                "The voucher amount does not match the statement line.",
                details={"voucher": str(voucher.total_debit), "statement": str(statement_amount)},
            )

        return await self.repo.update(
            transaction,
            {
                "reconciliation_status": "matched",
                "matched_voucher_id": voucher.id,
                "reconciled_by": auth.employee_id,
                "reconciled_at": datetime.now(timezone.utc),
            },
            actor_id=auth.user_id,
        )


def ledger_account_service(s: AsyncSession) -> LedgerAccountService:
    return LedgerAccountService(LedgerAccountRepository(s))


def voucher_service(s: AsyncSession) -> JournalVoucherService:
    return JournalVoucherService(JournalVoucherRepository(s))


def bank_reconciliation_service(s: AsyncSession) -> BankReconciliationService:
    return BankReconciliationService(BankTransactionRepository(s))
