/**
 * services/index.ts — barrel + authenticated resource registry.
 *
 * `resources` gives typed CRUD (list/get/create/update/delete) for every
 * REST module the backend exposes, so any screen can call e.g.
 *   import { resources } from "@/services";
 *   const { data, meta } = await resources.invoices.list({ page: 1 });
 * without a bespoke service file per module. Endpoints with extra sub-routes
 * (analytics, reports, payroll runs) still work for their CRUD surface here;
 * add a dedicated module only when a screen needs the non-CRUD actions.
 */
import { crud } from "./crud";

export * from "./auth";
export * from "./public";
export { publicApi } from "./public";
export { crud } from "./crud";
export type { CrudService, ListParams } from "./crud";

// Prefixes mirror backend/app/api/v1/router.py exactly.
export const resources = {
  // Identity & org
  users: crud("/users"),
  branches: crud("/branches"),
  employees: crud("/employees"),
  // CRM
  leads: crud("/leads"),
  consultations: crud("/consultations"),
  proposals: crud("/proposals"),
  contactRequests: crud("/contact-requests"),
  // Clients & catalogue
  clients: crud("/clients"),
  clientEntities: crud("/client-entities"),
  kycDocuments: crud("/kyc-documents"),
  services: crud("/services"),
  engagements: crud("/engagements"),
  // Documents
  documents: crud("/documents"),
  documentFolders: crud("/document-folders"),
  documentRequests: crud("/document-requests"),
  // Workflow
  tasks: crud("/tasks"),
  complianceTypes: crud("/compliance-types"),
  complianceCalendar: crud("/compliance-calendar"),
  // Audit
  audits: crud("/audits"),
  auditChecklists: crud("/audit-checklists"),
  auditObservations: crud("/audit-observations"),
  // Statutory
  taxReturns: crud("/tax-returns"),
  gstReturns: crud("/gst-returns"),
  // Payroll
  payrollRuns: crud("/payroll-runs"),
  payrollProfiles: crud("/payroll-profiles"),
  attendance: crud("/attendance"),
  statutoryRates: crud("/statutory-rates"),
  // Accounting
  ledgerAccounts: crud("/ledger-accounts"),
  vouchers: crud("/vouchers"),
  bankTransactions: crud("/bank-transactions"),
  // Billing
  invoices: crud("/invoices"),
  payments: crud("/payments"),
  creditNotes: crud("/credit-notes"),
  refunds: crud("/refunds"),
  // Communication
  notifications: crud("/notifications"),
  notificationTemplates: crud("/notification-templates"),
  queries: crud("/queries"),
  messages: crud("/messages"),
  communicationLogs: crud("/communication-logs"),
  // Reporting
  reports: crud("/reports"),
  analytics: crud("/analytics"),
  // CMS
  blogs: crud("/blogs"),
  careers: crud("/careers"),
  careerApplications: crud("/career-applications"),
  downloads: crud("/downloads"),
  testimonials: crud("/testimonials"),
  categories: crud("/categories"),
} as const;
