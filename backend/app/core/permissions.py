"""Role and permission model.

Authorization is enforced in the service/dependency layer; the database RLS
policies are defence in depth. This module is the single source of truth for
"who may do what" so the rules are auditable in one place.
"""

from __future__ import annotations

from app.core.compat import StrEnum


class Role(StrEnum):
    """Mirrors ``public.roles.code`` seeded in the database."""

    SUPER_ADMIN = "super_admin"
    MANAGING_PARTNER = "managing_partner"
    CHARTERED_ACCOUNTANT = "chartered_accountant"
    AUDIT_MANAGER = "audit_manager"
    TAX_MANAGER = "tax_manager"
    GST_CONSULTANT = "gst_consultant"
    ACCOUNTANT = "accountant"
    PAYROLL_EXECUTIVE = "payroll_executive"
    RELATIONSHIP_MANAGER = "relationship_manager"
    ACCOUNTS_ADMIN = "accounts_admin"
    CONTENT_MANAGER = "content_manager"
    CLIENT = "client"


STAFF_ROLES: frozenset[Role] = frozenset(set(Role) - {Role.CLIENT})
ADMIN_ROLES: frozenset[Role] = frozenset({Role.SUPER_ADMIN, Role.MANAGING_PARTNER})


class Action(StrEnum):
    READ = "read"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    APPROVE = "approve"
    EXPORT = "export"


class Module(StrEnum):
    USERS = "users"
    ROLES = "roles"
    EMPLOYEES = "employees"
    BRANCHES = "branches"
    CLIENTS = "clients"
    LEADS = "leads"
    CONSULTATIONS = "consultations"
    PROPOSALS = "proposals"
    SERVICES = "services"
    CLIENT_SERVICES = "client_services"
    DOCUMENTS = "documents"
    DOCUMENT_REQUESTS = "document_requests"
    TASKS = "tasks"
    COMPLIANCE = "compliance"
    AUDITS = "audits"
    TAX = "tax"
    GST = "gst"
    PAYROLL = "payroll"
    ACCOUNTING = "accounting"
    INVOICES = "invoices"
    PAYMENTS = "payments"
    REFUNDS = "refunds"
    NOTIFICATIONS = "notifications"
    QUERIES = "queries"
    CHAT = "chat"
    COMMUNICATION_LOG = "communication_log"
    REPORTS = "reports"
    ANALYTICS = "analytics"
    CMS = "cms"
    SETTINGS = "settings"
    ACTIVITY_LOGS = "activity_logs"


def perm(module: Module, action: Action) -> str:
    return f"{module.value}:{action.value}"


def _all(*modules: Module) -> set[str]:
    return {perm(m, a) for m in modules for a in Action}


def _rw(*modules: Module) -> set[str]:
    return {perm(m, a) for m in modules for a in (Action.READ, Action.CREATE, Action.UPDATE, Action.EXPORT)}


def _ro(*modules: Module) -> set[str]:
    return {perm(m, a) for m in modules for a in (Action.READ, Action.EXPORT)}


# Baseline every staff member gets.
_STAFF_BASE: set[str] = _ro(
    Module.CLIENTS, Module.SERVICES, Module.BRANCHES, Module.EMPLOYEES,
    Module.COMPLIANCE, Module.REPORTS,
) | _rw(Module.TASKS, Module.QUERIES, Module.CHAT, Module.COMMUNICATION_LOG, Module.DOCUMENTS) | {
    perm(Module.NOTIFICATIONS, Action.READ),
    perm(Module.NOTIFICATIONS, Action.UPDATE),
    perm(Module.ANALYTICS, Action.READ),
}

ROLE_PERMISSIONS: dict[Role, frozenset[str]] = {
    # Super Admin holds every permission; resolved dynamically in has_permission().
    Role.SUPER_ADMIN: frozenset({"*"}),

    Role.MANAGING_PARTNER: frozenset(
        _STAFF_BASE
        | _ro(*Module)
        | {perm(m, Action.APPROVE) for m in Module}
        | _rw(Module.CLIENTS, Module.INVOICES, Module.REFUNDS)
    ),

    Role.CHARTERED_ACCOUNTANT: frozenset(
        _STAFF_BASE
        | _rw(Module.AUDITS, Module.TAX, Module.GST, Module.ACCOUNTING, Module.DOCUMENT_REQUESTS)
        | {
            perm(Module.AUDITS, Action.APPROVE),
            perm(Module.TAX, Action.APPROVE),
            perm(Module.DOCUMENTS, Action.APPROVE),
            perm(Module.CLIENT_SERVICES, Action.READ),
        }
    ),

    Role.AUDIT_MANAGER: frozenset(
        _STAFF_BASE
        | _rw(Module.AUDITS, Module.DOCUMENT_REQUESTS)
        | {perm(Module.AUDITS, Action.DELETE), perm(Module.DOCUMENTS, Action.APPROVE)}
    ),

    Role.TAX_MANAGER: frozenset(
        _STAFF_BASE
        | _rw(Module.TAX, Module.DOCUMENT_REQUESTS)
        | {perm(Module.TAX, Action.APPROVE), perm(Module.DOCUMENTS, Action.APPROVE)}
    ),

    Role.GST_CONSULTANT: frozenset(
        _STAFF_BASE
        | _rw(Module.GST, Module.DOCUMENT_REQUESTS)
        | {perm(Module.DOCUMENTS, Action.APPROVE)}
    ),

    Role.ACCOUNTANT: frozenset(
        _STAFF_BASE
        | _rw(Module.ACCOUNTING, Module.INVOICES)
        | _ro(Module.PAYMENTS)
    ),

    Role.PAYROLL_EXECUTIVE: frozenset(
        _STAFF_BASE | _rw(Module.PAYROLL)
    ),

    Role.RELATIONSHIP_MANAGER: frozenset(
        _STAFF_BASE
        | _rw(Module.LEADS, Module.CONSULTATIONS, Module.PROPOSALS, Module.CLIENT_SERVICES)
        | {perm(Module.CLIENTS, Action.CREATE), perm(Module.CLIENTS, Action.UPDATE)}
    ),

    Role.ACCOUNTS_ADMIN: frozenset(
        _STAFF_BASE
        | _rw(Module.INVOICES, Module.PAYMENTS)
        | {perm(Module.REFUNDS, Action.READ), perm(Module.REFUNDS, Action.CREATE)}
    ),

    Role.CONTENT_MANAGER: frozenset(
        _rw(Module.CMS)
        | {
            perm(Module.NOTIFICATIONS, Action.READ),
            perm(Module.ANALYTICS, Action.READ),
            perm(Module.CMS, Action.DELETE),
        }
    ),

    # Clients act only on their own records; row scoping is applied separately.
    Role.CLIENT: frozenset({
        perm(Module.DOCUMENTS, Action.READ),
        perm(Module.DOCUMENTS, Action.CREATE),
        perm(Module.CLIENT_SERVICES, Action.READ),
        perm(Module.TASKS, Action.READ),
        perm(Module.COMPLIANCE, Action.READ),
        perm(Module.INVOICES, Action.READ),
        perm(Module.PAYMENTS, Action.READ),
        perm(Module.PAYMENTS, Action.CREATE),
        perm(Module.REPORTS, Action.READ),
        perm(Module.REPORTS, Action.EXPORT),
        perm(Module.QUERIES, Action.READ),
        perm(Module.QUERIES, Action.CREATE),
        perm(Module.CHAT, Action.READ),
        perm(Module.CHAT, Action.CREATE),
        perm(Module.NOTIFICATIONS, Action.READ),
        perm(Module.NOTIFICATIONS, Action.UPDATE),
        # Their own portal dashboard; the endpoint scopes every figure to the
        # signed-in client, so this grants no visibility beyond their records.
        perm(Module.ANALYTICS, Action.READ),
        perm(Module.DOCUMENT_REQUESTS, Action.READ),
        perm(Module.CLIENT_SERVICES, Action.READ),
        perm(Module.AUDITS, Action.READ),
        perm(Module.TAX, Action.READ),
        perm(Module.GST, Action.READ),
    }),
}


def has_permission(role: Role | str, permission: str) -> bool:
    try:
        role_enum = Role(role)
    except ValueError:
        return False
    granted = ROLE_PERMISSIONS.get(role_enum, frozenset())
    return "*" in granted or permission in granted


def permissions_for(role: Role | str) -> frozenset[str]:
    """Expanded permission set, used to populate the session/profile response."""
    try:
        role_enum = Role(role)
    except ValueError:
        return frozenset()
    granted = ROLE_PERMISSIONS.get(role_enum, frozenset())
    if "*" in granted:
        return frozenset(perm(m, a) for m in Module for a in Action)
    return granted


def is_staff(role: Role | str) -> bool:
    try:
        return Role(role) in STAFF_ROLES
    except ValueError:
        return False


def is_admin(role: Role | str) -> bool:
    try:
        return Role(role) in ADMIN_ROLES
    except ValueError:
        return False
