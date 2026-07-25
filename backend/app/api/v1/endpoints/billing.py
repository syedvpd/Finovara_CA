"""Invoicing, payments, credit notes, and refunds."""

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Header, Query, Request, status
from pydantic import BaseModel

from app.api.crud_router import build_crud_router
from app.api.deps import CurrentUser, DbSession
from app.core.permissions import Module
from app.schemas.common import MessageResponse, SuccessResponse
from app.schemas.finance import (
    CreditNoteCreate,
    CreditNoteRead,
    InvoiceCreate,
    InvoiceRead,
    InvoiceUpdate,
    PaymentCreate,
    PaymentRead,
    PaymentUpdate,
    ReceivablesSummary,
    RefundCreate,
    RefundRead,
)
from app.services.billing import credit_note_service, invoice_service, payment_service, refund_service


def _rid(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


async def invoice_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    branch_id: Annotated[UUID | None, Query()] = None,
) -> dict[str, Any]:
    return {
        k: v for k, v in {"client_id": client_id, "status": status, "branch_id": branch_id}.items() if v
    }


# create_schema is None: invoices are created through the endpoint below, which
# derives every total from the line items rather than trusting the payload.
router: APIRouter = build_crud_router(
    service_factory=invoice_service,
    read_schema=InvoiceRead,
    create_schema=None,
    update_schema=InvoiceUpdate,
    module=Module.INVOICES,
    resource_name="invoice",
    filter_dependency=invoice_filters,
)


@router.post(
    "",
    response_model=SuccessResponse[InvoiceRead],
    status_code=status.HTTP_201_CREATED,
    summary="Raise an invoice",
    description="Subtotal, tax and total are computed from the line items. "
    "Any amount supplied by the caller is ignored.",
)
async def create_invoice(
    request: Request, payload: InvoiceCreate, session: DbSession, auth: CurrentUser
) -> SuccessResponse[InvoiceRead]:
    invoice = await invoice_service(session).create_with_items(payload.model_dump(), auth)
    return SuccessResponse[InvoiceRead](
        data=InvoiceRead.model_validate(invoice), request_id=_rid(request)
    )


@router.get(
    "/summary/receivables",
    response_model=SuccessResponse[ReceivablesSummary],
    summary="Invoiced, collected, and outstanding totals",
)
async def receivables(
    request: Request,
    session: DbSession,
    auth: CurrentUser,
    client_id: Annotated[UUID | None, Query()] = None,
) -> SuccessResponse[ReceivablesSummary]:
    summary = await invoice_service(session).receivables(auth, client_id=client_id)
    return SuccessResponse[ReceivablesSummary](
        data=ReceivablesSummary.model_validate(summary), request_id=_rid(request)
    )


@router.post(
    "/refresh-overdue",
    response_model=MessageResponse,
    summary="Flag issued invoices past their due date",
)
async def refresh_overdue(request: Request, session: DbSession, auth: CurrentUser) -> MessageResponse:
    count = await invoice_service(session).refresh_overdue(auth)
    return MessageResponse(message=f"{count} invoice(s) marked overdue.", request_id=_rid(request))


# --- Payments ----------------------------------------------------------------


async def payment_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    invoice_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query(pattern="^(pending|cleared|failed|refunded)$")] = None,
    reconciliation_status: Annotated[str | None, Query(pattern="^(pending|reconciled)$")] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {
            "client_id": client_id, "invoice_id": invoice_id,
            "status": status, "reconciliation_status": reconciliation_status,
        }.items()
        if v
    }


payments_router: APIRouter = build_crud_router(
    service_factory=payment_service,
    read_schema=PaymentRead,
    create_schema=PaymentCreate,
    update_schema=PaymentUpdate,
    module=Module.PAYMENTS,
    resource_name="payment",
    filter_dependency=payment_filters,
    enable_delete=False,  # payments are never deleted; refund or void instead
)


@payments_router.post(
    "/{payment_id}/reconcile",
    response_model=SuccessResponse[PaymentRead],
    summary="Mark a payment matched against the bank statement",
)
async def reconcile_payment(
    request: Request, payment_id: UUID, session: DbSession, auth: CurrentUser
) -> SuccessResponse[PaymentRead]:
    payment = await payment_service(session).reconcile(payment_id, auth)
    return SuccessResponse[PaymentRead](
        data=PaymentRead.model_validate(payment), request_id=_rid(request)
    )


# --- Razorpay online payments ------------------------------------------------


class RazorpayOrderRequest(BaseModel):
    invoice_id: UUID


class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@payments_router.post(
    "/razorpay/order",
    response_model=SuccessResponse[dict],
    summary="Create a Razorpay order for an invoice's outstanding balance",
)
async def razorpay_order(
    request: Request, body: RazorpayOrderRequest, session: DbSession, auth: CurrentUser
) -> SuccessResponse[dict]:
    data = await payment_service(session).create_razorpay_order(body.invoice_id, auth)
    return SuccessResponse[dict](data=data, request_id=_rid(request))


@payments_router.post(
    "/razorpay/verify",
    response_model=SuccessResponse[PaymentRead],
    summary="Verify a Razorpay checkout callback and settle the payment",
)
async def razorpay_verify(
    request: Request, body: RazorpayVerifyRequest, session: DbSession, auth: CurrentUser
) -> SuccessResponse[PaymentRead]:
    payment = await payment_service(session).record_razorpay_capture(
        body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature, auth
    )
    return SuccessResponse[PaymentRead](
        data=PaymentRead.model_validate(payment), request_id=_rid(request)
    )


# Public, unauthenticated: Razorpay calls this server-to-server. Verified by the
# webhook HMAC signature, not by a session cookie.
razorpay_webhook_router: APIRouter = APIRouter()


@razorpay_webhook_router.post("/razorpay/webhook", summary="Razorpay payment webhook")
async def razorpay_webhook(
    request: Request, session: DbSession, x_razorpay_signature: str = Header(default="")
) -> dict[str, Any]:
    raw = await request.body()
    result = await payment_service(session).handle_razorpay_webhook(raw, x_razorpay_signature)
    return {"success": True, **result}


# --- Credit notes and refunds ------------------------------------------------


async def credit_note_filters(invoice_id: Annotated[UUID | None, Query()] = None) -> dict[str, Any]:
    return {"invoice_id": invoice_id} if invoice_id else {}


credit_notes_router: APIRouter = build_crud_router(
    service_factory=credit_note_service,
    read_schema=CreditNoteRead,
    create_schema=CreditNoteCreate,
    update_schema=None,
    module=Module.INVOICES,
    resource_name="credit note",
    filter_dependency=credit_note_filters,
    enable_delete=False,
)


async def refund_filters(
    payment_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query(pattern="^(pending|completed|failed)$")] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"payment_id": payment_id, "status": status}.items() if v}


refunds_router: APIRouter = build_crud_router(
    service_factory=refund_service,
    read_schema=RefundRead,
    create_schema=RefundCreate,
    update_schema=None,
    module=Module.REFUNDS,
    resource_name="refund",
    filter_dependency=refund_filters,
    enable_delete=False,
)
