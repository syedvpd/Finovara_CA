"""Razorpay gateway client.

Thin wrapper over the Razorpay REST API using httpx (no extra dependency) plus
stdlib HMAC for the two signature checks. Money is handled in paise (integer)
at the gateway boundary and converted back to rupee ``Decimal`` by callers.

Security: a payment is only ever marked *cleared* after (a) the checkout
signature verifies AND (b) the payment is re-fetched from Razorpay and confirmed
captured — the client's claimed status is never trusted.
"""

from __future__ import annotations

import hashlib
import hmac
from typing import Any

import httpx

from app.core.config import settings
from app.core.exceptions import AppError, ErrorCode
from app.core.logging import get_logger

logger = get_logger(__name__)

_API_BASE = "https://api.razorpay.com/v1"


class PaymentGatewayError(AppError):
    """Razorpay is unreachable, misconfigured, or rejected the request."""

    status_code = 502
    code = ErrorCode.DEPENDENCY_UNAVAILABLE


class RazorpayGateway:
    """Stateless helper; reads keys from settings on each call."""

    @staticmethod
    def enabled() -> bool:
        return settings.razorpay_enabled

    @staticmethod
    def _require_enabled() -> None:
        if not settings.razorpay_enabled:
            raise PaymentGatewayError(
                "Online payments are not configured. Set RAZORPAY_KEY_ID and "
                "RAZORPAY_KEY_SECRET."
            )

    @staticmethod
    def _auth() -> tuple[str, str]:
        return (settings.razorpay_key_id, settings.razorpay_key_secret)

    @classmethod
    async def create_order(
        cls, *, amount_paise: int, currency: str, receipt: str, notes: dict[str, str]
    ) -> dict[str, Any]:
        cls._require_enabled()
        payload = {
            "amount": amount_paise,
            "currency": currency,
            "receipt": receipt[:40],
            "notes": notes,
            "payment_capture": 1,
        }
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.post(f"{_API_BASE}/orders", json=payload, auth=cls._auth())
        except httpx.HTTPError as exc:  # network/timeout
            raise PaymentGatewayError("Could not reach the payment gateway.") from exc
        if resp.status_code not in (200, 201):
            logger.warning("razorpay_order_failed", status=resp.status_code, body=resp.text[:300])
            raise PaymentGatewayError("The payment gateway rejected the order request.")
        return resp.json()

    @classmethod
    async def fetch_payment(cls, payment_id: str) -> dict[str, Any]:
        cls._require_enabled()
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(f"{_API_BASE}/payments/{payment_id}", auth=cls._auth())
        except httpx.HTTPError as exc:
            raise PaymentGatewayError("Could not reach the payment gateway.") from exc
        if resp.status_code != 200:
            logger.warning("razorpay_fetch_failed", status=resp.status_code, body=resp.text[:300])
            raise PaymentGatewayError("The payment could not be verified with the gateway.")
        return resp.json()

    @classmethod
    def verify_payment_signature(cls, order_id: str, payment_id: str, signature: str) -> bool:
        """Checkout callback signature: HMAC_SHA256(order_id|payment_id, secret)."""
        expected = hmac.new(
            settings.razorpay_key_secret.encode(),
            f"{order_id}|{payment_id}".encode(),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature or "")

    @classmethod
    def verify_webhook_signature(cls, raw_body: bytes, signature: str) -> bool:
        """Webhook signature: HMAC_SHA256(raw_body, webhook_secret)."""
        secret = settings.razorpay_webhook_secret
        if not secret:
            return False
        expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature or "")


# Razorpay payment.method -> our PAYMENT_METHODS enum.
_METHOD_MAP = {
    "upi": "upi",
    "netbanking": "net_banking",
    "card": "card",
    "wallet": "net_banking",
    "emi": "card",
    "bank_transfer": "bank_transfer",
}


def map_method(razorpay_method: str | None) -> str:
    return _METHOD_MAP.get((razorpay_method or "").lower(), "card")
