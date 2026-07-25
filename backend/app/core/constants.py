"""Domain constants: storage buckets, accepted media types, workflow states."""

from __future__ import annotations

from app.core.compat import StrEnum


class Bucket(StrEnum):
    """Buckets provisioned by the Supabase migration."""

    CLIENT_DOCUMENTS = "client-documents"
    AUDIT_DOCUMENTS = "audit-documents"
    TAX_DOCUMENTS = "tax-documents"
    GST_DOCUMENTS = "gst-documents"
    PAYROLL = "payroll"
    GENERATED_REPORTS = "generated-reports"
    GENERATED_PDFS = "generated-pdfs"
    WEBSITE_ASSETS = "website-assets"
    CAREER_APPLICATIONS = "career-applications"
    AVATARS = "avatars"
    TEMPORARY = "temporary-files"


PUBLIC_BUCKETS: frozenset[str] = frozenset({Bucket.WEBSITE_ASSETS, Bucket.AVATARS})

#: Which bucket each document category is stored in.
CATEGORY_BUCKETS: dict[str, Bucket] = {
    "tax": Bucket.TAX_DOCUMENTS,
    "gst": Bucket.GST_DOCUMENTS,
    "audit": Bucket.AUDIT_DOCUMENTS,
    "payroll": Bucket.PAYROLL,
    "report": Bucket.GENERATED_REPORTS,
    "invoice": Bucket.GENERATED_PDFS,
    "kyc": Bucket.CLIENT_DOCUMENTS,
    "general": Bucket.CLIENT_DOCUMENTS,
}

DOCUMENT_CATEGORIES: tuple[str, ...] = tuple(CATEGORY_BUCKETS)

#: Accepted upload types. Mirrors the ``allowed_mime_types`` on each bucket;
#: enforced here too so a bad upload is rejected before it reaches storage.
ALLOWED_MIME_TYPES: frozenset[str] = frozenset({
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "text/csv",
    "application/zip",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
})

#: Extensions that must never be accepted regardless of the declared MIME type.
BLOCKED_EXTENSIONS: frozenset[str] = frozenset({
    ".exe", ".dll", ".so", ".bat", ".cmd", ".com", ".scr", ".msi", ".ps1",
    ".sh", ".bash", ".js", ".jar", ".vbs", ".php", ".py", ".rb", ".html",
    ".htm", ".svg", ".apk", ".app", ".pkg", ".deb", ".rpm",
})

#: Magic-number prefixes used to confirm a file is what it claims to be.
MAGIC_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    "application/pdf": (b"%PDF-",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/webp": (b"RIFF",),
    "application/zip": (b"PK\x03\x04", b"PK\x05\x06"),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": (b"PK\x03\x04",),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (b"PK\x03\x04",),
}

DOCUMENT_STATUSES: tuple[str, ...] = ("draft", "pending_verification", "verified", "rejected")

TASK_STATUSES: tuple[str, ...] = (
    "backlog", "todo", "in_progress", "review", "partner_approval", "client_approval", "done",
)

#: The documented task lifecycle. Any task may be sent back for rework.
TASK_TRANSITIONS: dict[str, set[str]] = {
    "backlog": {"todo"},
    "todo": {"in_progress", "backlog"},
    "in_progress": {"review", "todo"},
    "review": {"partner_approval", "in_progress"},
    "partner_approval": {"client_approval", "done", "in_progress"},
    "client_approval": {"done", "in_progress"},
    "done": set(),
}

AUDIT_TRANSITIONS: dict[str, set[str]] = {
    "assigned": {"document_requested"},
    "document_requested": {"verifying"},
    "verifying": {"observation_recorded", "document_requested"},
    "observation_recorded": {"draft_prepared", "verifying"},
    "draft_prepared": {"partner_review"},
    "partner_review": {"final_approved", "draft_prepared"},
    "final_approved": {"completed"},
    "completed": set(),
}

TAX_RETURN_TRANSITIONS: dict[str, set[str]] = {
    "received": {"collecting_documents"},
    "collecting_documents": {"preparing_return"},
    "preparing_return": {"internal_review", "collecting_documents"},
    "internal_review": {"client_approval_pending", "preparing_return"},
    "client_approval_pending": {"client_approved", "preparing_return"},
    "client_approved": {"return_filed"},
    "return_filed": {"acknowledgement_received"},
    "acknowledgement_received": set(),
}

GST_RETURN_TRANSITIONS: dict[str, set[str]] = {
    "received": {"sales_collected"},
    "sales_collected": {"purchase_collected"},
    "purchase_collected": {"reconciled"},
    "reconciled": {"return_prepared", "purchase_collected"},
    "return_prepared": {"return_reviewed", "reconciled"},
    "return_reviewed": {"return_filed", "return_prepared"},
    "return_filed": {"acknowledgement_received"},
    "acknowledgement_received": set(),
}

INVOICE_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"sent", "void"},
    "sent": {"partially_paid", "paid", "overdue", "void"},
    "partially_paid": {"paid", "overdue", "void"},
    "overdue": {"partially_paid", "paid", "void"},
    "paid": set(),
    "void": set(),
}

PAYROLL_RUN_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"calculated"},
    "calculated": {"verified", "draft"},
    "verified": {"paid", "calculated"},
    "paid": set(),
}

VOUCHER_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"posted"},
    "posted": {"reversed"},
    "reversed": set(),
}

GST_RETURN_TYPES: tuple[str, ...] = ("gstr_1", "gstr_3b", "gstr_9", "gstr_9c")

#: Statutory GST filing deadlines, as day-of-month after the period ends.
GST_DUE_DAY: dict[str, int] = {"gstr_1": 11, "gstr_3b": 20, "gstr_9": 31, "gstr_9c": 31}
