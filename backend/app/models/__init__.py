"""SQLAlchemy models mapped onto the Supabase-owned schema.

Importing this package registers every mapper, so relationship strings resolve.
"""

from app.db.base import Base
from app.models.accounting import BankTransaction, JournalVoucher, JournalVoucherLine, LedgerAccount
from app.models.clients import (
    Client,
    ClientEntity,
    ClientKycDocument,
    ClientService,
    Consultation,
    Lead,
    Proposal,
    Service,
)
from app.models.content import (
    ActivityLog,
    Blog,
    Career,
    CareerApplication,
    ChatMessage,
    CommunicationLog,
    Download,
    Notification,
    NotificationTemplate,
    Query,
    QueryResponse,
    Testimonial,
    WebsiteSetting,
)
from app.models.finance import (
    CreditNote,
    DebitNote,
    DocumentNumberCounter,
    EmployeePayrollProfile,
    EmployeePayrollRecord,
    GeneralLedgerEntry,
    Invoice,
    InvoiceItem,
    Payment,
    PayrollRun,
    Refund,
)
from app.models.identity import (
    Branch,
    Employee,
    EmployeeBranchAccess,
    LoginHistory,
    Permission,
    Role,
    RolePermission,
    User,
    UserSession,
)
from app.models.operations import (
    Audit,
    AuditChecklistItem,
    AuditObservation,
    AuditResponse,
    ComplianceCalendarEntry,
    ComplianceRule,
    ComplianceType,
    Document,
    DocumentActionLog,
    DocumentFolder,
    DocumentRequest,
    DocumentVersion,
    GstReturn,
    Task,
    TaskAssignment,
    TaxReturn,
)
from app.models.reference import Category, DocumentCategory, FinancialYear
from app.models.security import (
    AccountLockout,
    LoginAttempt,
    PasswordHistory,
    SecurityEvent,
    StepUpChallenge,
    UserDevice,
    UserMfaFactor,
)
from app.models.system import (
    AppSetting,
    ContactRequest,
    PayrollAttendance,
    PayrollStatutoryConfig,
    Report,
    ReportTemplate,
)

__all__ = [
    "Category", "DocumentCategory", "FinancialYear",
    "AccountLockout", "LoginAttempt", "PasswordHistory", "SecurityEvent",
    "StepUpChallenge", "UserDevice", "UserMfaFactor",
    "AppSetting", "BankTransaction", "ContactRequest", "JournalVoucher",
    "JournalVoucherLine", "LedgerAccount", "PayrollAttendance",
    "PayrollStatutoryConfig", "Report", "ReportTemplate",
    "ActivityLog", "Audit", "AuditChecklistItem", "AuditObservation", "AuditResponse",
    "Base", "Blog", "Branch", "Career", "CareerApplication", "ChatMessage", "CommunicationLog", "Client",
    "ClientEntity", "ClientKycDocument", "ClientService", "ComplianceCalendarEntry",
    "ComplianceRule", "ComplianceType", "Consultation", "CreditNote", "DebitNote",
    "Document", "DocumentActionLog", "DocumentFolder", "DocumentNumberCounter",
    "DocumentRequest", "DocumentVersion", "Download", "Employee", "EmployeeBranchAccess",
    "EmployeePayrollProfile", "EmployeePayrollRecord", "GeneralLedgerEntry", "GstReturn",
    "Invoice", "InvoiceItem", "Lead", "LoginHistory", "Notification",
    "NotificationTemplate", "Payment", "PayrollRun", "Permission", "Proposal", "Query",
    "QueryResponse", "Refund", "Testimonial", "Role", "RolePermission", "Service", "Task",
    "TaskAssignment", "TaxReturn", "User", "UserSession", "WebsiteSetting",
]
