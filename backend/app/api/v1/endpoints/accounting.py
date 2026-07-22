"""Accounting endpoints: chart of accounts, vouchers, reconciliation."""

from datetime import date
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Query, Request, status

from app.api.crud_router import build_crud_router
from app.api.deps import CurrentUser, DbSession
from app.core.permissions import Module
from app.schemas.accounting import (
    BankMatchRequest,
    BankStatementImport,
    BankTransactionRead,
    JournalVoucherCreate,
    JournalVoucherRead,
    JournalVoucherUpdate,
    LedgerAccountCreate,
    LedgerAccountRead,
    LedgerAccountUpdate,
    TrialBalance,
)
from app.schemas.common import BulkActionResult, SuccessResponse
from app.services.accounting import bank_reconciliation_service, ledger_account_service, voucher_service


def _rid(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


async def account_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    account_type: Annotated[str | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {"client_id": client_id, "account_type": account_type, "is_active": is_active}.items()
        if v is not None
    }


accounts_router: APIRouter = build_crud_router(
    service_factory=ledger_account_service,
    read_schema=LedgerAccountRead,
    create_schema=LedgerAccountCreate,
    update_schema=LedgerAccountUpdate,
    module=Module.ACCOUNTING,
    resource_name="ledger account",
    filter_dependency=account_filters,
)


async def voucher_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    voucher_type: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query(pattern="^(draft|posted|reversed)$")] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {"client_id": client_id, "voucher_type": voucher_type, "status": status}.items()
        if v
    }


# create_schema is None: vouchers are created below so the balance invariant is
# enforced server-side alongside the line rows.
vouchers_router: APIRouter = build_crud_router(
    service_factory=voucher_service,
    read_schema=JournalVoucherRead,
    create_schema=None,
    update_schema=JournalVoucherUpdate,
    module=Module.ACCOUNTING,
    resource_name="voucher",
    filter_dependency=voucher_filters,
)


@vouchers_router.post(
    "",
    response_model=SuccessResponse[JournalVoucherRead],
    status_code=status.HTTP_201_CREATED,
    summary="Raise a journal voucher",
    description="Debits must equal credits. The voucher is created as a draft; "
    "post it separately to commit it to the books.",
)
async def create_voucher(
    request: Request, payload: JournalVoucherCreate, session: DbSession, auth: CurrentUser
) -> SuccessResponse[JournalVoucherRead]:
    voucher = await voucher_service(session).create_with_lines(payload.model_dump(), auth)
    return SuccessResponse[JournalVoucherRead](
        data=JournalVoucherRead.model_validate(voucher), request_id=_rid(request)
    )


@vouchers_router.post(
    "/{voucher_id}/reverse",
    response_model=SuccessResponse[JournalVoucherRead],
    summary="Reverse a posted voucher",
    description="Posts a mirror-image voucher. Posted entries are never edited "
    "or deleted, so the audit trail stays intact.",
)
async def reverse_voucher(
    request: Request, voucher_id: UUID, session: DbSession, auth: CurrentUser
) -> SuccessResponse[JournalVoucherRead]:
    reversal = await voucher_service(session).reverse(voucher_id, auth)
    return SuccessResponse[JournalVoucherRead](
        data=JournalVoucherRead.model_validate(reversal), request_id=_rid(request)
    )


@vouchers_router.get(
    "/trial-balance/{client_id}",
    response_model=SuccessResponse[TrialBalance],
    summary="Trial balance as at a date",
    description="Posted entries only. Draft and reversed vouchers are excluded.",
)
async def trial_balance(
    request: Request,
    client_id: UUID,
    session: DbSession,
    auth: CurrentUser,
    as_of: Annotated[date | None, Query(description="Defaults to today")] = None,
) -> SuccessResponse[TrialBalance]:
    result = await voucher_service(session).trial_balance(client_id, auth, as_of=as_of)
    return SuccessResponse[TrialBalance](
        data=TrialBalance.model_validate(result), request_id=_rid(request)
    )


# --- Bank reconciliation -----------------------------------------------------


async def bank_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    reconciliation_status: Annotated[
        str | None, Query(pattern="^(unreconciled|matched|manual|ignored)$")
    ] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {"client_id": client_id, "reconciliation_status": reconciliation_status}.items()
        if v
    }


bank_router: APIRouter = build_crud_router(
    service_factory=bank_reconciliation_service,
    read_schema=BankTransactionRead,
    create_schema=None,
    update_schema=None,
    module=Module.ACCOUNTING,
    resource_name="bank transaction",
    filter_dependency=bank_filters,
    enable_delete=False,
)


@bank_router.post(
    "/import",
    response_model=SuccessResponse[BulkActionResult],
    summary="Import bank statement lines",
    description="Duplicate lines are detected by content hash, so re-uploading "
    "the same statement is harmless rather than double-counting.",
)
async def import_statement(
    request: Request, payload: BankStatementImport, session: DbSession, auth: CurrentUser
) -> SuccessResponse[BulkActionResult]:
    result = await bank_reconciliation_service(session).import_statement(payload.model_dump(), auth)
    return SuccessResponse[BulkActionResult](
        data=BulkActionResult.model_validate(result), request_id=_rid(request)
    )


@bank_router.post(
    "/{transaction_id}/match",
    response_model=SuccessResponse[BankTransactionRead],
    summary="Match a statement line to a posted voucher",
)
async def match_transaction(
    request: Request,
    transaction_id: UUID,
    payload: BankMatchRequest,
    session: DbSession,
    auth: CurrentUser,
) -> SuccessResponse[BankTransactionRead]:
    transaction = await bank_reconciliation_service(session).match(
        transaction_id, payload.voucher_id, auth
    )
    return SuccessResponse[BankTransactionRead](
        data=BankTransactionRead.model_validate(transaction), request_id=_rid(request)
    )
