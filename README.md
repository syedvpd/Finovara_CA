# Finovara Chartered Accountants LLP

Finovara Chartered Accountants LLP is an enterprise-grade financial-services platform combining a premium corporate website, a secure client portal, and an administrative ERP dashboard for practice management.

```
FINOVARA_CA_LLP/
├── Finovara_Frontend/  Next.js / React + Vite frontend (TypeScript, Tailwind v4, Radix, MUI)
├── backend/            FastAPI backend (Python 3.12, SQLAlchemy, Supabase)
└── supabase/           PostgreSQL schema — migrations, RLS, triggers, tests
```

---

## 1. Project Vision & Scope

Finovara offers premium chartered accountancy and business advisory services including **Taxation, GST, Auditing, Accounting, Company Compliance, Payroll, Financial Advisory, Virtual CFO, Document Management, and Client Service Tracking**.

### Core Deliverables
*   **Corporate Website**: High-converting, premium design emphasizing credibility, services, and industry segments.
*   **Secure Client Portal**: A secure dashboard for clients to submit documentation, raise queries, track filing status, download reports, view billing invoices, and pay online.
*   **Admin Panel / ERP Dashboard**: Practice management tools enabling role-based task delegation, compliance calendars, workflow automation, audit oversight, payroll processing, and structured billing.

---

## 2. Technical Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js, React 18, Vite 6, TypeScript |
| **Styling & Animations** | Tailwind CSS v4, Framer Motion, Radix UI, Material UI (MUI 7) |
| **Backend API** | Python 3.12, FastAPI (using `orjson` for fast serialization) |
| **Database** | PostgreSQL hosted on Supabase (using RLS, functions, and database triggers) |
| **ORM & Migrations** | SQLAlchemy (Async asyncio), Alembic |
| **Authentication** | Supabase Auth (JWT with OTP, password support, and HttpOnly session cookies) |
| **File Storage** | Supabase Storage (Secure private buckets with signed time-limited URLs) |
| **Reporting & Data** | Python Pandas, ReportLab, jsPDF (client-side PDF generation) |
| **Payment Gateway** | Razorpay Standard Checkout Integration |
| **Charts** | Recharts (Responsive financial and workload tracking) |
| **Worker Queue** | `arq` (Redis-based background scheduler) |

---

## 3. Firm Profile & Brand Identity

### Company Specifications
*   **Legal Name**: Finovara Chartered Accountants LLP
*   **Brand Names**: Finovara Advisory / Finovara
*   **Headquarters**: Hyderabad, Telangana, India
*   **Branch Network**: Hyderabad, Bengaluru, Vijayawada, Visakhapatnam, Chennai, Pune
*   **Team Strength**: 65+ Professionals (CAs, Audit Managers, Tax Consultants, GST Specialists, Company Law Consultants, Accountants, Payroll Executives, Financial Analysts, Compliance Officers, RM, Support)
*   **Mission**: Simplify accounting, taxation, audit, and regulatory compliance through expert guidance, secure digital workflows, and reliable client service.
*   **Vision**: To become a trusted technology-enabled financial advisory firm delivering accurate, transparent, and timely professional services.
*   **Taglines**:
    *   *Clarity in Finance. Confidence in Growth.* (Primary)
    *   *Compliance Made Intelligent.*
    *   *Trusted Financial Expertise. Better Decisions for Every Stage.*

### Business Statistics (Target Verification)
*   **65+** Professionals
*   **1,500+** Clients Supported
*   **4,000+** Tax Filings Completed
*   **750+** GST Registrations and Returns
*   **500+** Audit Assignments
*   **300+** Company Incorporation Assignments
*   **150+** Virtual CFO Engagements
*   **20+** Industry Segments Served
*   **96%** Client Retention Rate
*   **24-Hour** Initial Response SLA

### Brand Guidelines & Colors
*   **Financial Navy** (`#102A43`): Primary header, footer, and brand typography.
*   **Emerald Green** (`#087F5B`): Growth, success, and compliance accents.
*   **Premium Gold** (`#C8A45D` / `#CB8A45D`): High-value markers, logo icons, and highlights.
*   **Cloud White** (`#F7F9FC`): Dashboard backdrops and structural layouts.
*   **Slate Grey** (`#52606D`): Secondary body copy and metadata labels.
*   **Typography**: *Manrope* (Headings), *Inter* (Body text), *IBM Plex Sans* (Dashboard components).

---

## 4. User Roles & Permission Matrices

The platform implements 11 distinct staff/internal roles plus the Client role:

1.  **Admin / Super Admin**: Complete, system-wide CRUD access, settings configurations, and KPI metrics.
2.  **Managing Partner**: High-level firm reporting, branch performance, profit analyses, and business-critical approvals (audits, tax, GST filings, refund approvals).
3.  **Chartered Accountant**: Oversight of assigned clients, team/auditor assignments, query resolutions, and certification issuances.
4.  **Audit Manager**: Audit assignment creation, checklist setups, observations recording, and audit workflows from planning to draft reporting.
5.  **Tax Manager**: Income tax filing tracking, tax calculations, refund tracking, and compliance notice uploads.
6.  **GST Consultant**: Monthly/annual GST filing reviews, ledger-sales reconciliation checks, and tax reconciliation summaries.
7.  **Partner Accountant**: Journal/voucher creation, ledger management, and bank import reconciliations.
8.  **Payroll Executive**: Salary structuring, attendance verification, payroll runs, and Payslip generation.
9.  **Relationship Manager (RM)**: Client onboarding, lead management, query redirection, and service tracking.
10. **Accounts Admin**: Invoice generation, payment tracking, payment reminders, and billing reports.
11. **Content Manager**: Website CMS section management, blog editing (SEO headers, schedules), and career vacancy updates.
12. **Client**: Portal access to manage profile, view active services, upload requested items, download tax acknowledgments/audits, view invoices, and pay online.

---

## 5. Portal & Dashboard Architecture

### Client Portal Modules
*   **Active Services**: Status tracking of active professional engagements.
*   **Pending Tasks**: Client-side actionable checklist.
*   **Document Vault**: Categorized folders containing signed PDF audits, bank statements, ITR receipts, and corporate filings.
*   **Open Queries**: Support ticketing system to raise questions to the assigned CA.
*   **Filing Status**: Real-time progress trackers for GST/ITR submissions.
*   **Invoices & Payments**: Outstanding invoices with integrated Razorpay "Pay Now" option.
*   **Assigned Consultant**: Dynamic card showing RM details, email, phone, and hours.

### Admin Panel Modules
*   **Practice Statistics**: Total clients, active engagements, pending filings, due this week, overdue tasks, revenue trackers.
*   **Service & Client Management**: Client onboarding directories, service catalogs, and proposal registers.
*   **Workflows**: Direct modules for statutory tracking (Audit, Tax, GST), Task Assignment engines, and the Interactive Compliance Calendar.
*   **Ledgers & Vouchers**: Accounting tables for journal entries and balance sheets.
*   **CMS Management**: Blog posting utilities, career applicant trackers, and site banner controls.

---

## 6. Database Schema (Schema Registry)

The platform is backed by a structured relational PostgreSQL schema hosted on Supabase, comprising the following primary tables:

*   **Identity & Onboarding**: `users`, `permissions`, `clients`, `client_entities`, `employees`
*   **Services Catalogue**: `services`, `client_services` (engagements)
*   **Tasks & Compliance**: `compliance_tasks`, `compliance_calendar`, `task_assignments`
*   **Document Vault**: `documents`, `document_versions`, `document_requests`
*   **Auditing Module**: `audit_assignments`, `audit_checklists`, `audit_observations`, `audit_responses`
*   **Statutory Returns**: `tax_returns`, `gst_returns`
*   **Accounting Registry**: `vouchers`, `ledger_accounts`
*   **Payroll Modules**: `payroll_cycles`, `payroll_employees`
*   **Billing & Payments**: `invoices`, `payments`, `consultations`, `queries`, `categories`, `testimonials`, `downloads`
*   **Content & System CMS**: `job_positions`, `job_applications`, `site_settings`, `audit_logs`

---

## 7. Setup & Run Instructions

### Prerequisites
*   Python 3.12+
*   Node 18+
*   Supabase Account (Active project ref)
*   Redis (Local or Cloud URL)

### 1. Database Migrations (Supabase)
Apply migrations in sequential dependency order to set up schemas, RLS policies, custom hooks, and initial reference data:
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```
*Note: Ensure to enable the **Custom Access Token Hook** inside Supabase Dashboard (Authentication -> Hooks) mapping it to `public.custom_access_token_hook` for role-based token injections.*

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Configure DATABASE_URL, Redis, Brevo and Supabase Keys
python -m uvicorn app.main:app --reload
```
*   **Docs**: http://localhost:8000/docs
*   **Healthcheck**: http://localhost:8000/health/ready
*   **Test Suite**: `python -m pytest`

### 3. Frontend Setup
```bash
cd Finovara_Frontend
npm install
cp .env.example .env.local      # Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```
*   Runs locally on http://localhost:5173. Ensure your backend `CORS_ORIGINS` allows this host.
