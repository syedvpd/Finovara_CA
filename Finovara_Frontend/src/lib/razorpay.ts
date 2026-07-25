/**
 * razorpay.ts — client-side Razorpay Checkout bridge.
 *
 * The backend creates the order (amount derived from the invoice, never the
 * client) and later verifies the signed callback before marking the payment
 * cleared. This module only opens the hosted checkout and relays the signed
 * result back for verification — it never sees or sets a payment status.
 */
import { api } from "./api";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise: Promise<void> | null = null;

function loadCheckout(): Promise<void> {
  if ((window as any).Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = CHECKOUT_SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Could not load the payment gateway."));
      document.body.appendChild(s);
    });
  }
  return scriptPromise;
}

interface OrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  invoice_number: string;
  name: string;
}

export type PayResult = "paid" | "dismissed";

/** Open Razorpay Checkout for an invoice and verify the result server-side. */
export async function payInvoiceWithRazorpay(
  invoiceId: string,
  prefill: { name?: string; email?: string; contact?: string } = {},
): Promise<PayResult> {
  await loadCheckout();
  const order = await api.post<OrderResponse>("/payments/razorpay/order", { invoice_id: invoiceId });

  return new Promise<PayResult>((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: `Invoice ${order.invoice_number}`,
      order_id: order.order_id,
      prefill,
      theme: { color: "#087F5B" },
      handler: async (resp: any) => {
        try {
          await api.post("/payments/razorpay/verify", {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          resolve("paid");
        } catch (err) {
          reject(err);
        }
      },
      modal: { ondismiss: () => resolve("dismissed") },
    });
    rzp.on("payment.failed", (r: any) =>
      reject(new Error(r?.error?.description ?? "The payment failed.")),
    );
    rzp.open();
  });
}
