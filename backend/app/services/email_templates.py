"""Branded HTML for outgoing email.

Every message the firm sends carries the same frame, so a one-time passcode and
a document request are recognisably from the same practice. The layout is
deliberately plain: tables, inline styles, no external CSS or images. Outlook
ignores stylesheets, Gmail strips <style> blocks in some clients, and images
are blocked by default almost everywhere — a design that depends on any of
those arrives broken at exactly the moment it matters, which for us is a
sign-in code.
"""

from __future__ import annotations

from html import escape

NAVY = "#102A43"
EMERALD = "#087F5B"
GOLD = "#C8A45D"
CLOUD = "#F7F9FC"
SLATE = "#52606D"

FIRM_NAME = "Finovara Chartered Accountants LLP"
FIRM_TAGLINE = "Clarity in Finance. Confidence in Growth."


def _button(label: str, url: str) -> str:
    return f"""
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
        <tr><td style="border-radius:10px;background:{EMERALD};">
          <a href="{escape(url, quote=True)}"
             style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;
                    font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">
            {escape(label)}
          </a>
        </td></tr>
      </table>"""


def layout(*, heading: str, body_html: str, preheader: str = "") -> str:
    """Wrap message content in the firm's frame.

    `preheader` is the grey line inboxes show beside the subject. Left empty it
    fills with whatever text comes first, which is usually the logo alt text.
    """
    return f"""<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:{CLOUD};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{escape(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{CLOUD};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;
                    border:1px solid rgba(16,42,67,0.08);">

        <tr><td style="background:{NAVY};padding:28px 32px;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#ffffff;">
            Finovara
          </div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;
                      color:{GOLD};text-transform:uppercase;margin-top:4px;">
            Chartered Accountants LLP
          </div>
        </td></tr>

        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:21px;
                     line-height:1.3;color:{NAVY};">{escape(heading)}</h1>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:{SLATE};">
            {body_html}
          </div>
        </td></tr>

        <tr><td style="padding:22px 32px;background:{CLOUD};border-top:1px solid rgba(16,42,67,0.06);">
          <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:{NAVY};font-weight:bold;">
            {FIRM_NAME}
          </p>
          <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:{SLATE};">
            {FIRM_TAGLINE}
          </p>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#829AB1;line-height:1.6;">
            Hyderabad &middot; Bengaluru &middot; Vijayawada &middot; Visakhapatnam &middot; Chennai &middot; Pune<br>
            This message and any attachments are confidential and intended for the named recipient.
            If it reached you in error, please delete it and let us know.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _paras(*paragraphs: str) -> str:
    return "".join(f"<p style='margin:0 0 14px;'>{escape(p)}</p>" for p in paragraphs)


def one_time_passcode(code: str, minutes: int = 10) -> tuple[str, str]:
    """Sign-in code. Returned as (subject, html)."""
    body = (
        _paras("Use this code to sign in to your Finovara portal:")
        + f"""
        <div style="margin:22px 0;padding:18px;border-radius:12px;background:{CLOUD};
                    border:1px dashed rgba(8,127,91,0.35);text-align:center;">
          <div style="font-family:'Courier New',monospace;font-size:30px;font-weight:bold;
                      letter-spacing:8px;color:{NAVY};">{escape(code)}</div>
        </div>"""
        + _paras(
            f"The code expires in {minutes} minutes and can be used once.",
            "If you did not try to sign in, you can ignore this email — your account is unaffected. "
            "Nobody at Finovara will ever ask you for this code.",
        )
    )
    return "Your Finovara sign-in code", layout(
        heading="Your sign-in code",
        body_html=body,
        preheader=f"Your Finovara sign-in code expires in {minutes} minutes.",
    )


def password_reset(reset_url: str) -> tuple[str, str]:
    body = (
        _paras("We received a request to reset the password on your Finovara portal account.")
        + _button("Choose a new password", reset_url)
        + _paras(
            "The link expires shortly and can be used once.",
            "If you did not request this, no action is needed — your current password still works.",
        )
    )
    return "Reset your Finovara password", layout(
        heading="Reset your password", body_html=body, preheader="A link to set a new password."
    )


def contact_acknowledgement(name: str) -> tuple[str, str]:
    body = _paras(
        f"Dear {name},",
        "Thank you for contacting Finovara. Your enquiry has reached our team and a consultant "
        "will be in touch, usually within one working day.",
        "If your matter is time-sensitive — an approaching filing deadline or a notice you have "
        "received — please reply to this email and say so, and we will prioritise it.",
    )
    return "We have received your enquiry", layout(
        heading="Thank you for getting in touch",
        body_html=body,
        preheader="A consultant will be in touch within one working day.",
    )


def document_request(client_name: str, document: str, due: str, portal_url: str) -> tuple[str, str]:
    body = (
        _paras(
            f"Dear {client_name},",
            f"To continue with your engagement we need the following document: {document}.",
            f"Please upload it by {due}.",
        )
        + _button("Upload in the portal", portal_url)
        + _paras("Documents uploaded to the portal are encrypted and visible only to the team assigned to your work.")
    )
    return f"Document requested: {document}", layout(
        heading="A document is needed",
        body_html=body,
        preheader=f"{document} — please upload by {due}.",
    )


def generic(heading: str, *paragraphs: str) -> tuple[str, str]:
    """For notification-template rows that carry their own copy."""
    return heading, layout(heading=heading, body_html=_paras(*paragraphs), preheader=paragraphs[0] if paragraphs else "")
