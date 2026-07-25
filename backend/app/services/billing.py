"""Invoicing, payments, credit notes, and refunds.

Money is only ever recomputed from source rows, never trusted from a payload:
invoice totals are derived from their line items, and an invoice's paid and
outstanding amounts are maintained by the database reconciliation trigger.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import INVOICE_TRANSITIONS
from app.core.exceptions import (
    AlreadyExistsError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.core.logging import get_logger
from app.core.permissions import Action, Module, Role
from app.core.security import AuthContext
from app.models.finance import CreditNote, Invoice, InvoiceItem, Payment, Refund
from app.repositories.clients import ClientRepository, ClientServiceRepository
from app.repositories.finance import (
    CreditNoteRepository,
    InvoiceRepository,
    PaymentRepository,
    RefundRepository,
)
from app.repositories.identity import BranchRepository
from app.services.base import BaseService
from app.utils.money import ZERO, money, percent_of

logger = get_logger(__name__)

#: Roles permitted to approve a refund or a discount.
APPROVAL_ROLES = frozenset({Role.SUPER_ADMIN, Role.MANAGING_PARTNER})


class InvoiceService(BaseService[Invoice, InvoiceRepository]):
    module = Module.INVOICES
    transitions = INVOICE_TRANSITIONS

    async def create_with_items(self, payload: dict[str, Any], auth: AuthContext) -> Invoice:
        """Create an invoice and its lines, computing every total server-side."""
        self._require(auth, Action.CREATE)
        session = self.repo.session

        if await ClientRepository(session).get(payload["client_id"]) is None:
            raise NotFoundError("Client", payload["client_id"])
        if await BranchRepository(session).get(payload["branch_id"]) is None:
            raise NotFoundError("Branch", payload["branch_id"])
        if engagement_id := payload.get("client_service_id"):
            engagement = await ClientServiceRepository(session).get(engagement_id)
            if engagement is None:
                raise NotFoundError("Engagement", engagement_id)
            if engagement.client_id != payload["client_id"]:
                raise ValidationError("That engagement belongs to a different client.")

        items = payload.get("items") or []
        if not items:
            raise ValidationError("An invoice must contain at least one line item.")

        subtotal = ZERO
        tax_total = ZERO
        computed_items: list[dict[str, Any]] = []

        for line in items:
            quantity = int(line["quantity"])
            unit_price = money(line["unit_price"])
            rate = money(line.get("tax_rate_percent", "18.00"))

            line_net = money(unit_price * quantity)
            line_tax = percent_of(line_net, rate)

            subtotal += line_net
            tax_total += line_tax
            computed_items.append(
                {
                    "service_id": line.get("service_id"),
                    "description": line["description"],
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "tax_rate_percent": rate,
                    "tax_amount": line_tax,
                    "total_amount": money(line_net + line_tax),
                }
            )

        discount = money(payload.get("discount_amount", 0))
        if discount > subtotal:
            raise ValidationError("The discount cannot exceed the invoice subtotal.")

        # A discount is a revenue concession and needs partner sign-off.
        discount_approver: UUID | None = None
        if discount > ZERO:
            if auth.role not in APPROVAL_ROLES:
                raise ForbiddenError("Only a Managing Partner may apply a discount to an invoice.")
            discount_approver = auth.employee_id

        total = money(subtotal - discount + tax_total)

        invoice = await self.repo.create(
            {
                "client_id": payload["client_id"],
                "client_service_id": payload.get("client_service_id"),
                "branch_id": payload["branch_id"],
                "issue_date": payload.get("issue_date") or date.today(),
                "due_date": payload["due_date"],
                "status": "draft",
                "subtotal": money(subtotal),
                "discount_amount": discount,
                "discount_approved_by": discount_approver,
                "tax_amount": money(tax_total),
                "total_amount": total,
                "paid_amount": ZERO,
                "outstanding_amount": total,
                "notes": payload.get("notes"),
            },
            actor_id=auth.user_id,
        )

        session.add_all(
            InvoiceItem(invoice_id=invoice.id, created_at=datetime.now(timezone.utc), **item)
            for item in computed_items
        )
        await session.flush()
        await session.refresh(invoice)

        logger.info("invoice_created", invoice_id=str(invoice.id), total=str(total))
        return invoice

    async def _before_update(
        self, entity: Invoice, data: dict[str, Any], auth: AuthContext
    ) -> dict[str, Any]:
        # Totals are derived; they can never be patched directly.
        for protected in ("subtotal", "tax_amount", "total_amount", "paid_amount", "outstanding_amount"):
            data.pop(protected, None)

        if entity.status != "draft" and "discount_amount" in data:
            raise ConflictError("A discount can only be applied while the invoice is a draft.")

        if data.get("status") == "void":
            if entity.paid_amount > ZERO:
                raise ConflictError(
                    "This invoice has payments against it. Issue a credit note instead of voiding it."
                )
            if auth.role not in APPROVAL_ROLES:
                raise ForbiddenError("Only a Managing Partner may void an invoice.")

        return data

    async def _before_delete(self, entity: Invoice, auth: AuthContext) -> None:
        if entity.paid_amount > ZERO:
            raise ConflictError("An invoice with recorded payments cannot be deleted.")
        if entity.status != "draft":
            raise ConflictError("Only a draft invoice can be deleted; void it instead.")

    async def receivables(self, auth: AuthContext, *, client_id: UUID | None = None) -> dict[str, Any]:
        self._require(auth, Action.READ)
        if auth.is_client:
            client_id = auth.client_id
        return await self.repo.receivables(
            client_id=client_id, branch_id=None if auth.is_admin else auth.branch_id
        )

    async def refresh_overdue(self, auth: AuthContext) -> int:
        self._require(auth, Action.UPDATE)
        return await self.repo.mark_overdue(date.today())


class PaymentService(BaseService[Payment, PaymentRepository]):
    module = Module.PAYMENTS

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        session = self.repo.session

        invoice = await InvoiceRepository(session).get(data["invoice_id"])
        if invoice is None:
            raise NotFoundError("Invoice", data["invoice_id"])
        if invoice.status == "void":
            raise ConflictError("Payment cannot be recorded against a voided invoice.")
        if invoice.status == "draft":
            raise ConflictError("This invoice has not been issued yet.")

        amount = money(data["amount"])
        if amount <= ZERO:
            raise ValidationError("A payment amount must be greater than zero.")

        # Reject a duplicate bank reference before it double-credits the ledger.
        if reference := data.get("transaction_id"):
            if await self.repo.transaction_id_taken(reference):
                raise AlreadyExistsError("A payment with that transaction reference already exists.")

        already_paid = await self.repo.cleared_total(invoice.id)
        credited = await CreditNoteRepository(session).active_total(invoice.id)
        remaining = money(invoice.total_amount - credited - already_paid)

        if amount > remaining:
            raise ValidationError(
                f"The payment exceeds the outstanding balance of {remaining}.",
                details={"outstanding": str(remaining), "submitted": str(amount)},
            )

        data["client_id"] = invoice.client_id
        data["amount"] = amount
        data.setdefault("payment_date", date.today())
        # A client-initiated payment is unconfirmed until finance clears it.
        data["status"] = "pending" if auth.is_client else data.get("status", "cleared")
        # payment_number is issued by a database trigger.
        data.pop("payment_number", None)
        return data

    async def _before_update(
        self, entity: Payment, data: dict[str, Any], auth: AuthContext
    ) -> dict[str, Any]:
        if entity.status in ("cleared", "refunded") and data.get("status") == "pending":
            raise ConflictError("A cleared payment cannot be returned to pending.")
        for protected in ("amount", "invoice_id", "client_id", "payment_number"):
            data.pop(protected, None)
        return data

    async def reconcile(self, payment_id: UUID, auth: AuthContext) -> Payment:
        """Mark a payment as matched against the bank statement."""
        self._require(auth, Action.UPDATE)
        if not auth.is_staff:
            raise ForbiddenError("Only firm personnel may reconcile payments.")

        payment = await self.repo.get_scoped_or_404(payment_id, auth)
        if payment.status != "cleared":
            raise ConflictError("Only a cleared payment can be reconciled.")
        if payment.reconciliation_status == "reconciled":
            raise ConflictError("This payment is already reconciled.")

        return await self.repo.update(
            payment,
            {
                "reconciliation_status": "reconciled",
                "reconciled_by": auth.employee_id,
                "reconciled_at": datetime.now(timezone.utc),
            },
            actor_id=auth.user_id,
        )

    # --- Razorpay online payments -------------------------------------------

    async def _outstanding(self, invoice: Invoice) -> Decimal:
        already = await self.repo.cleared_total(invoice.id)
        credited = await CreditNoteRepository(self.repo.session).active_total(invoice.id)
        return money(invoice.total_amount - credited - already)

    async def _payment_by_txn(self, ref: str) -> Payment | None:
        result = await self.repo.session.execute(
            select(Payment).where(Payment.transaction_id == ref)
        )
        return result.scalar_one_or_none()

    async def create_razorpay_order(self, invoice_id: UUID, auth: AuthContext) -> dict[str, Any]:
        """Create a Razorpay order for an invoice's outstanding balance."""
        from app.services.razorpay import RazorpayGateway

        self._require(auth, Action.CREATE)
        invoice = await InvoiceRepository(self.repo.session).get(invoice_id)
        if invoice is None:
            raise NotFoundError("Invoice", invoice_id)
        if auth.is_client and invoice.client_id != auth.client_id:
            raise ForbiddenError("You can only pay your own invoices.")
        if invoice.status == "void":
            raise ConflictError("This invoice has been voided.")
        if invoice.status == "draft":
            raise ConflictError("This invoice has not been issued yet.")

        outstanding = await self._outstanding(invoice)
        if outstanding <= ZERO:
            raise ConflictError("This invoice is already fully paid.")

        amount_paise = int((outstanding * 100).to_integral_value())
        order = await RazorpayGateway.create_order(
            amount_paise=amount_paise,
            currency=settings.payment_currency.upper(),
            receipt=invoice.invoice_number,
            notes={"invoice_id": str(invoice.id), "client_id": str(invoice.client_id)},
        )

        # Record a pending payment keyed by the order id; capture flips it to cleared.
        if not await self._payment_by_txn(order["id"]):
            await self.repo.create(
                {
                    "invoice_id": invoice.id,
                    "client_id": invoice.client_id,
                    "amount": outstanding,
                    "payment_date": date.today(),
                    "payment_method": "card",
                    "transaction_id": order["id"],
                    "status": "pending",
                },
                actor_id=auth.user_id,
            )

        return {
            "order_id": order["id"],
            "amount": amount_paise,
            "currency": order["currency"],
            "key_id": settings.razorpay_key_id,
            "invoice_number": invoice.invoice_number,
            "name": "Finovara Chartered Accountants LLP",
        }

    async def record_razorpay_capture(
        self, order_id: str, payment_id: str, signature: str, auth: AuthContext
    ) -> Payment:
        """Verify the checkout callback and settle the payment (client-facing)."""
        self._require(auth, Action.CREATE)
        return await self._settle_capture(
            order_id, payment_id, signature, actor_id=auth.user_id, verify_sig=True
        )

    async def handle_razorpay_webhook(self, raw_body: bytes, signature: str) -> dict[str, Any]:
        """Gateway-to-server webhook: settle on payment.captured (idempotent)."""
        from app.services.razorpay import RazorpayGateway

        if not RazorpayGateway.verify_webhook_signature(raw_body, signature):
            raise ForbiddenError("Invalid webhook signature.")
        event = json.loads(raw_body or b"{}")
        if event.get("event") != "payment.captured":
            return {"ignored": event.get("event")}
        entity = (event.get("payload") or {}).get("payment", {}).get("entity", {})
        order_id, payment_id = entity.get("order_id"), entity.get("id")
        if not order_id or not payment_id:
            return {"ignored": "missing_ids"}
        await self._settle_capture(
            order_id, payment_id, signature="", actor_id=None,
            verify_sig=False, method=entity.get("method"),
        )
        return {"processed": payment_id}

    async def _settle_capture(
        self, order_id: str, payment_id: str, signature: str, *,
        actor_id: UUID | None, verify_sig: bool, method: str | None = None,
    ) -> Payment:
        from app.services.razorpay import RazorpayGateway, map_method

        if verify_sig and not RazorpayGateway.verify_payment_signature(order_id, payment_id, signature):
            raise ForbiddenError("Payment signature verification failed.")

        # Authoritative: re-fetch from Razorpay and confirm it was actually captured.
        entity = await RazorpayGateway.fetch_payment(payment_id)
        if entity.get("order_id") != order_id:
            raise ConflictError("Payment does not match the order.")
        if entity.get("status") not in ("captured", "authorized"):
            raise ConflictError(f"Payment not captured (status={entity.get('status')}).")

        # Idempotency — already settled under the gateway payment id.
        settled = await self._payment_by_txn(payment_id)
        if settled and settled.status == "cleared":
            return settled

        method_code = map_method(method or entity.get("method"))
        pending = await self._payment_by_txn(order_id)
        if pending is not None:
            return await self.repo.update(
                pending,
                {"status": "cleared", "transaction_id": payment_id, "payment_method": method_code},
                actor_id=actor_id,
            )

        # Fallback (webhook without a pre-recorded order row): create from notes.
        invoice_id = (entity.get("notes") or {}).get("invoice_id")
        if not invoice_id:
            logger.warning("razorpay_capture_no_invoice", order_id=order_id, payment_id=payment_id)
            raise ConflictError("Could not map the payment to an invoice.")
        invoice = await InvoiceRepository(self.repo.session).get(UUID(invoice_id))
        if invoice is None:
            raise NotFoundError("Invoice", invoice_id)
        return await self.repo.create(
            {
                "invoice_id": invoice.id,
                "client_id": invoice.client_id,
                "amount": money(Decimal(entity["amount"]) / 100),
                "payment_date": date.today(),
                "payment_method": method_code,
                "transaction_id": payment_id,
                "status": "cleared",
            },
            actor_id=actor_id,
        )


class CreditNoteService(BaseService[CreditNote, CreditNoteRepository]):
    module = Module.INVOICES

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if auth.role not in APPROVAL_ROLES:
            raise ForbiddenError("Only a Managing Partner may issue a credit note.")

        invoice = await InvoiceRepository(self.repo.session).get(data["invoice_id"])
        if invoice is None:
            raise NotFoundError("Invoice", data["invoice_id"])

        existing = await self.repo.active_total(invoice.id)
        amount = money(data["amount"])
        if existing + amount > invoice.total_amount:
            raise ValidationError(
                "Credit notes cannot exceed the invoice total.",
                details={"invoice_total": str(invoice.total_amount), "already_credited": str(existing)},
            )

        data["amount"] = amount
        data.pop("credit_note_number", None)
        return data


class RefundService(BaseService[Refund, RefundRepository]):
    module = Module.REFUNDS

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if auth.role not in APPROVAL_ROLES:
            raise ForbiddenError("Only a Managing Partner may approve a refund.")

        payment = await PaymentRepository(self.repo.session).get(data["payment_id"])
        if payment is None:
            raise NotFoundError("Payment", data["payment_id"])
        if payment.status != "cleared":
            raise ConflictError("Only a cleared payment can be refunded.")

        already = await self.repo.refunded_total(payment.id)
        amount = money(data["amount"])
        if already + amount > payment.amount:
            raise ValidationError(
                "The refund exceeds the amount received.",
                details={"payment_amount": str(payment.amount), "already_refunded": str(already)},
            )

        data["amount"] = amount
        data.setdefault("refund_date", date.today())
        data["approved_by"] = auth.employee_id
        data.pop("refund_number", None)
        return data


def invoice_service(s: AsyncSession) -> InvoiceService:
    return InvoiceService(InvoiceRepository(s))


def payment_service(s: AsyncSession) -> PaymentService:
    return PaymentService(PaymentRepository(s))


def credit_note_service(s: AsyncSession) -> CreditNoteService:
    return CreditNoteService(CreditNoteRepository(s))


def refund_service(s: AsyncSession) -> RefundService:
    return RefundService(RefundRepository(s))
