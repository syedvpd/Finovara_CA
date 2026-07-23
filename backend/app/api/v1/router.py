"""Aggregate v1 API router."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import (
    accounting,
    auth,
    billing,
    branches,
    clients,
    cms,
    communications,
    crm,
    documents,
    employees,
    onboarding,
    operations,
    payroll,
    reference,
    reports,
    security,
    users,
)

api_router = APIRouter()

# Public website — unauthenticated by design.
api_router.include_router(cms.public_router, prefix="/public", tags=["Public Website"])

# Identity and organisation
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(security.router, prefix="/auth", tags=["Authentication · Security"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(branches.router, prefix="/branches", tags=["Branches"])
api_router.include_router(employees.router, prefix="/employees", tags=["Employees"])
api_router.include_router(onboarding.router, prefix="/onboarding", tags=["Admin · Onboarding"])

# CRM
api_router.include_router(crm.leads_router, prefix="/leads", tags=["CRM · Leads"])
api_router.include_router(crm.consultations_router, prefix="/consultations", tags=["CRM · Consultations"])
api_router.include_router(crm.proposals_router, prefix="/proposals", tags=["CRM · Proposals"])
api_router.include_router(cms.contact_router, prefix="/contact-requests", tags=["CRM · Contact Requests"])

# Clients and catalogue
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(clients.entities_router, prefix="/client-entities", tags=["Clients · Entities"])
api_router.include_router(clients.kyc_router, prefix="/kyc-documents", tags=["Clients · KYC"])
api_router.include_router(clients.services_router, prefix="/services", tags=["Services"])
api_router.include_router(clients.engagements_router, prefix="/engagements", tags=["Services · Engagements"])

# Document vault
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(documents.folders_router, prefix="/document-folders", tags=["Documents · Folders"])
api_router.include_router(documents.requests_router, prefix="/document-requests", tags=["Documents · Requests"])

# Workflow
api_router.include_router(operations.tasks_router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(operations.compliance_types_router, prefix="/compliance-types", tags=["Compliance"])
api_router.include_router(operations.calendar_router, prefix="/compliance-calendar", tags=["Compliance"])

# Audit
api_router.include_router(operations.audits_router, prefix="/audits", tags=["Audit"])
api_router.include_router(operations.checklists_router, prefix="/audit-checklists", tags=["Audit · Checklists"])
api_router.include_router(operations.observations_router, prefix="/audit-observations", tags=["Audit · Observations"])

# Statutory filings
api_router.include_router(operations.tax_router, prefix="/tax-returns", tags=["Income Tax"])
api_router.include_router(operations.gst_router, prefix="/gst-returns", tags=["GST"])

# Payroll
api_router.include_router(payroll.router, prefix="/payroll-runs", tags=["Payroll"])
api_router.include_router(payroll.profiles_router, prefix="/payroll-profiles", tags=["Payroll · Employees"])
api_router.include_router(payroll.attendance_router, prefix="/attendance", tags=["Payroll · Attendance"])
api_router.include_router(payroll.statutory_router, prefix="/statutory-rates", tags=["Payroll · Statutory Rates"])

# Accounting
api_router.include_router(accounting.accounts_router, prefix="/ledger-accounts", tags=["Accounting · Chart of Accounts"])
api_router.include_router(accounting.vouchers_router, prefix="/vouchers", tags=["Accounting · Vouchers"])
api_router.include_router(accounting.bank_router, prefix="/bank-transactions", tags=["Accounting · Reconciliation"])

# Billing
api_router.include_router(billing.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(billing.payments_router, prefix="/payments", tags=["Payments"])
api_router.include_router(billing.credit_notes_router, prefix="/credit-notes", tags=["Payments · Credit Notes"])
api_router.include_router(billing.refunds_router, prefix="/refunds", tags=["Payments · Refunds"])

# Communication
api_router.include_router(communications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(communications.templates_router, prefix="/notification-templates", tags=["Notifications · Templates"])
api_router.include_router(communications.queries_router, prefix="/queries", tags=["Queries"])
api_router.include_router(communications.chat_router, prefix="/messages", tags=["Messages"])

# Reporting and analytics
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(reports.analytics_router, prefix="/analytics", tags=["Analytics"])

# Website CMS
api_router.include_router(cms.blogs_router, prefix="/blogs", tags=["CMS · Blog"])
api_router.include_router(cms.careers_router, prefix="/careers", tags=["CMS · Careers"])
api_router.include_router(cms.applications_router, prefix="/career-applications", tags=["CMS · Applications"])
api_router.include_router(cms.downloads_router, prefix="/downloads", tags=["CMS · Downloads"])
api_router.include_router(cms.testimonials_router, prefix="/testimonials", tags=["CMS · Testimonials"])
api_router.include_router(cms.settings_router, prefix="/settings", tags=["Settings"])

# Reference data
api_router.include_router(reference.router, prefix="/reference", tags=["Reference Data"])
api_router.include_router(reference.categories_router, prefix="/categories", tags=["CMS · Categories"])
