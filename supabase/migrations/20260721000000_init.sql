-- 20260721000000_init.sql
-- Finovara Chartered Accountants LLP (Supabase PostgreSQL Enterprise Schema)

-- 1. Enable Required Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "pg_trgm";

-- 2. Core Authentication & RBAC Tables
create table public.roles (
    id uuid primary key default gen_random_uuid(),
    name varchar(100) not null unique,
    code varchar(50) not null unique,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.permissions (
    id uuid primary key default gen_random_uuid(),
    name varchar(100) not null unique,
    code varchar(50) not null unique,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.role_permissions (
    role_id uuid references public.roles(id) on delete cascade,
    permission_id uuid references public.permissions(id) on delete cascade,
    primary key (role_id, permission_id)
);

create table public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    role_id uuid references public.roles(id) on delete restrict,
    email citext not null unique,
    first_name varchar(100) not null,
    last_name varchar(100) not null,
    phone varchar(20),
    avatar_url text,
    status varchar(20) not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    deleted_by uuid references public.users(id) on delete set null
);

create table public.login_history (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade,
    ip_address varchar(45) not null,
    user_agent text,
    device_info jsonb,
    logged_in_at timestamptz not null default now()
);

create table public.user_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade,
    token_hash varchar(255) not null,
    expires_at timestamptz not null,
    created_at timestamptz not null default now(),
    last_active_at timestamptz not null default now()
);

-- 3. Organization & Team Tables
create table public.branches (
    id uuid primary key default gen_random_uuid(),
    name varchar(100) not null unique,
    code varchar(20) not null unique,
    address text not null,
    email citext not null,
    phone varchar(20) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    deleted_by uuid references public.users(id) on delete set null
);

create table public.employees (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references public.users(id) on delete cascade,
    employee_code varchar(30) not null unique,
    branch_id uuid not null references public.branches(id) on delete restrict,
    designation varchar(100) not null,
    department varchar(100) not null,
    pan varchar(10) unique check (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'),
    date_of_joining date not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    deleted_by uuid references public.users(id) on delete set null
);

create table public.employee_branch_access (
    employee_id uuid references public.employees(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete cascade,
    primary key (employee_id, branch_id)
);

-- 4. CRM & Client Onboarding Tables
create table public.leads (
    id uuid primary key default gen_random_uuid(),
    name varchar(150) not null,
    email citext not null,
    phone varchar(20) not null,
    company_name varchar(150),
    source varchar(50) not null,
    status varchar(30) not null default 'new' check (status in ('new', 'contacted', 'consultation_scheduled', 'proposal_sent', 'onboarding', 'won', 'lost')),
    assigned_rm_id uuid references public.employees(id) on delete set null,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null
);

create table public.consultations (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references public.leads(id) on delete cascade,
    scheduled_at timestamptz not null,
    status varchar(30) not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null
);

create table public.proposals (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references public.leads(id) on delete cascade,
    title varchar(150) not null,
    status varchar(30) not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    total_value numeric(15,2) not null default 0.00,
    content jsonb not null,
    sent_at timestamptz,
    accepted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null
);

create table public.clients (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references public.users(id) on delete cascade,
    client_code varchar(30) not null unique,
    branch_id uuid not null references public.branches(id) on delete restrict,
    relationship_manager_id uuid references public.employees(id) on delete set null,
    client_type varchar(30) not null check (client_type in ('individual', 'partnership', 'llp', 'private_limited', 'startup', 'other')),
    status varchar(20) not null default 'active' check (status in ('active', 'inactive', 'suspended')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    deleted_by uuid references public.users(id) on delete set null
);

create table public.client_entities (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    legal_name varchar(150) not null,
    trade_name varchar(150),
    entity_type varchar(50) not null check (entity_type in ('sole_proprietorship', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'trust', 'other')),
    pan varchar(10) unique check (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'),
    gst_number varchar(15) unique check (gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'),
    cin varchar(21) unique check (cin ~ '^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$'),
    registered_address text not null,
    billing_address text,
    date_of_incorporation date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    deleted_by uuid references public.users(id) on delete set null
);

create table public.client_documents_kyc (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    document_type varchar(50) not null,
    document_url text not null,
    status varchar(30) not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
    verified_by uuid references public.employees(id) on delete set null,
    verified_at timestamptz,
    rejection_reason text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null
);

-- 5. Services Catalog
create table public.services (
    id uuid primary key default gen_random_uuid(),
    name varchar(150) not null unique,
    code varchar(50) not null unique,
    description text,
    department varchar(50) not null,
    base_price numeric(15,2) not null default 0.00,
    billing_cycle varchar(30) not null check (billing_cycle in ('one_time', 'monthly', 'quarterly', 'annually')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    deleted_by uuid references public.users(id) on delete set null
);

create table public.client_services (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    service_id uuid not null references public.services(id) on delete restrict,
    status varchar(30) not null default 'active' check (status in ('active', 'suspended', 'completed', 'cancelled')),
    start_date date not null,
    end_date date,
    price_agreed numeric(15,2) not null,
    billing_cycle varchar(30) not null check (billing_cycle in ('one_time', 'monthly', 'quarterly', 'annually')),
    next_billing_date date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null
);

-- 6. Compliance Calendar & Rules
create table public.compliance_types (
    id uuid primary key default gen_random_uuid(),
    name varchar(100) not null unique,
    description text,
    authority varchar(50) not null check (authority in ('income_tax', 'gst', 'mca', 'pf_esi', 'other')),
    frequency varchar(30) not null check (frequency in ('monthly', 'quarterly', 'annually', 'one_time')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.compliance_rules (
    id uuid primary key default gen_random_uuid(),
    compliance_type_id uuid not null references public.compliance_types(id) on delete cascade,
    due_date_formula jsonb not null,
    penalty_formula jsonb,
    warning_days_before integer not null default 7,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.compliance_calendar (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    entity_id uuid references public.client_entities(id) on delete cascade,
    compliance_type_id uuid not null references public.compliance_types(id) on delete restrict,
    due_date date not null,
    status varchar(30) not null default 'pending' check (status in ('pending', 'filed', 'overdue', 'waived')),
    filing_date date,
    acknowledgement_number varchar(100),
    tax_year varchar(10) not null,
    period varchar(30),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 7. Tasks & Assignments
create table public.tasks (
    id uuid primary key default gen_random_uuid(),
    title varchar(150) not null,
    description text,
    task_type varchar(30) not null check (task_type in ('audit', 'gst', 'tax', 'payroll', 'general')),
    status varchar(30) not null default 'todo' check (status in ('backlog', 'todo', 'in_progress', 'review', 'partner_approval', 'client_approval', 'done')),
    priority varchar(20) not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
    due_date date,
    client_id uuid not null references public.clients(id) on delete cascade,
    service_assignment_id uuid references public.client_services(id) on delete set null,
    branch_id uuid not null references public.branches(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    deleted_by uuid references public.users(id) on delete set null
);

create table public.task_assignments (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    employee_id uuid not null references public.employees(id) on delete cascade,
    role varchar(30) not null check (role in ('assignee', 'reviewer', 'approver')),
    assigned_at timestamptz not null default now(),
    completed_at timestamptz,
    status varchar(30) not null default 'pending' check (status in ('pending', 'completed', 'reassigned')),
    created_by uuid references public.users(id) on delete set null
);

-- 8. Document Vault Tables
create table public.document_folders (
    id uuid primary key default gen_random_uuid(),
    parent_id uuid references public.document_folders(id) on delete cascade,
    name varchar(100) not null,
    client_id uuid not null references public.clients(id) on delete cascade,
    is_private boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.documents (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    folder_id uuid references public.document_folders(id) on delete set null,
    name varchar(255) not null,
    description text,
    file_path text not null,
    file_size bigint not null,
    mime_type varchar(100) not null,
    file_category varchar(50) not null check (file_category in ('tax', 'gst', 'audit', 'payroll', 'report', 'invoice', 'kyc', 'general')),
    status varchar(30) not null default 'pending_verification' check (status in ('draft', 'pending_verification', 'verified', 'rejected')),
    is_encrypted boolean not null default false,
    tags text[] not null default '{}',
    version_count integer not null default 1,
    verified_by uuid references public.employees(id) on delete set null,
    verified_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    deleted_by uuid references public.users(id) on delete set null
);

create table public.document_versions (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    version_number integer not null,
    file_path text not null,
    file_size bigint not null,
    change_summary text,
    created_at timestamptz not null default now(),
    created_by uuid references public.users(id) on delete set null
);

create table public.document_requests (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    task_id uuid references public.tasks(id) on delete set null,
    title varchar(150) not null,
    description text,
    file_types_accepted text[] not null default '{}',
    due_date date,
    status varchar(30) not null default 'pending' check (status in ('pending', 'fulfilled', 'overdue')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null
);

create table public.document_actions_log (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    user_id uuid references public.users(id) on delete set null,
    action_type varchar(30) not null check (action_type in ('upload', 'view', 'download', 'edit', 'delete', 'verify')),
    ip_address varchar(45),
    user_agent text,
    created_at timestamptz not null default now()
);

-- 9. Audit Module Tables
create table public.audits (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    service_id uuid not null references public.services(id) on delete restrict,
    start_date date not null,
    end_date date,
    audit_type varchar(50) not null check (audit_type in ('statutory', 'internal', 'tax', 'stock', 'concurrent', 'process', 'compliance', 'management')),
    status varchar(30) not null default 'assigned' check (status in ('assigned', 'document_requested', 'verifying', 'observation_recorded', 'draft_prepared', 'partner_review', 'final_approved', 'completed')),
    risk_rating varchar(20) not null default 'medium' check (risk_rating in ('low', 'medium', 'high')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    deleted_by uuid references public.users(id) on delete set null
);

create table public.audit_checklists (
    id uuid primary key default gen_random_uuid(),
    audit_id uuid not null references public.audits(id) on delete cascade,
    item_name varchar(150) not null,
    description text,
    status varchar(30) not null default 'pending' check (status in ('pending', 'completed', 'not_applicable')),
    verified_by uuid references public.employees(id) on delete set null,
    verified_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.audit_observations (
    id uuid primary key default gen_random_uuid(),
    audit_id uuid not null references public.audits(id) on delete cascade,
    title varchar(150) not null,
    description text not null,
    risk_level varchar(20) not null check (risk_level in ('low', 'medium', 'high')),
    status varchar(30) not null default 'open' check (status in ('open', 'management_responded', 'resolved', 'closed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null
);

create table public.audit_responses (
    id uuid primary key default gen_random_uuid(),
    observation_id uuid not null references public.audit_observations(id) on delete cascade,
    responder_id uuid not null references public.users(id) on delete restrict,
    response_text text not null,
    responded_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

-- 10. Tax & GST Filing Modules
create table public.tax_returns (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    entity_id uuid not null references public.client_entities(id) on delete restrict,
    financial_year varchar(10) not null,
    assessment_year varchar(10) not null,
    return_type varchar(30) not null,
    status varchar(50) not null check (status in ('received', 'collecting_documents', 'preparing_return', 'internal_review', 'client_approval_pending', 'client_approved', 'return_filed', 'acknowledgement_received')),
    calculated_taxable_income numeric(15,2),
    calculated_tax_liability numeric(15,2),
    tax_paid numeric(15,2),
    refund_claimed numeric(15,2),
    refund_status varchar(30) check (refund_status in ('pending', 'received', 'adjusted')),
    acknowledgement_url text,
    filed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.gst_returns (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    entity_id uuid not null references public.client_entities(id) on delete restrict,
    period_month integer check (period_month between 1 and 12),
    period_year integer not null,
    return_type varchar(30) not null check (return_type in ('gstr_1', 'gstr_3b', 'gstr_9', 'gstr_9c')),
    status varchar(50) not null check (status in ('received', 'sales_collected', 'purchase_collected', 'reconciled', 'return_prepared', 'return_reviewed', 'return_filed', 'acknowledgement_received')),
    liability_amount numeric(15,2),
    input_tax_credit numeric(15,2),
    late_fee_calculated numeric(15,2),
    late_fee_paid numeric(15,2),
    filed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 11. Payroll Modules
create table public.payroll_runs (
    id uuid primary key default gen_random_uuid(),
    branch_id uuid not null references public.branches(id) on delete restrict,
    period_month integer not null check (period_month between 1 and 12),
    period_year integer not null,
    status varchar(30) not null default 'draft' check (status in ('draft', 'calculated', 'verified', 'paid')),
    total_gross numeric(15,2) not null default 0.00,
    total_deductions numeric(15,2) not null default 0.00,
    total_net numeric(15,2) not null default 0.00,
    processed_by uuid references public.employees(id) on delete set null,
    processed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.employee_payroll_profiles (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    employee_name varchar(150) not null,
    employee_code varchar(30) not null,
    pan varchar(10) check (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'),
    pf_number varchar(30),
    uan varchar(12) check (uan ~ '^[0-9]{12}$'),
    esi_number varchar(17),
    bank_account_no varchar(30) not null,
    bank_ifsc varchar(11) not null,
    base_salary numeric(15,2) not null default 0.00,
    monthly_allowances jsonb not null default '{}',
    monthly_deductions jsonb not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    deleted_by uuid references public.users(id) on delete set null,
    unique (client_id, employee_code)
);

create table public.employee_payroll_records (
    id uuid primary key default gen_random_uuid(),
    payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
    employee_profile_id uuid not null references public.employee_payroll_profiles(id) on delete cascade,
    attendance_days numeric(4,1) not null,
    lwp_days numeric(4,1) not null default 0.0,
    basic_salary_earned numeric(15,2) not null,
    gross_salary numeric(15,2) not null,
    pf_deduction numeric(15,2) not null default 0.00,
    esi_deduction numeric(15,2) not null default 0.00,
    pt_deduction numeric(15,2) not null default 0.00,
    tds_deduction numeric(15,2) not null default 0.00,
    other_deductions numeric(15,2) not null default 0.00,
    net_salary numeric(15,2) not null,
    payslip_url text,
    paid_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 12. Billing & Invoicing Modules
create table public.invoices (
    id uuid primary key default gen_random_uuid(),
    invoice_number varchar(50) not null unique,
    client_id uuid not null references public.clients(id) on delete cascade,
    client_service_id uuid references public.client_services(id) on delete set null,
    branch_id uuid not null references public.branches(id) on delete restrict,
    issue_date date not null default current_date,
    due_date date not null,
    status varchar(30) not null default 'draft' check (status in ('draft', 'sent', 'partially_paid', 'paid', 'void', 'overdue')),
    subtotal numeric(15,2) not null default 0.00,
    discount_amount numeric(15,2) not null default 0.00,
    discount_approved_by uuid references public.employees(id) on delete set null,
    tax_amount numeric(15,2) not null default 0.00,
    total_amount numeric(15,2) not null default 0.00,
    paid_amount numeric(15,2) not null default 0.00,
    outstanding_amount numeric(15,2) not null default 0.00,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    deleted_by uuid references public.users(id) on delete set null
);

create table public.invoice_items (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references public.invoices(id) on delete cascade,
    service_id uuid references public.services(id) on delete set null,
    description text not null,
    quantity integer not null default 1,
    unit_price numeric(15,2) not null,
    tax_rate_percent numeric(5,2) not null default 18.00,
    tax_amount numeric(15,2) not null,
    total_amount numeric(15,2) not null,
    created_at timestamptz not null default now()
);

create table public.payments (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references public.invoices(id) on delete restrict,
    payment_number varchar(50) not null unique,
    client_id uuid not null references public.clients(id) on delete restrict,
    amount numeric(15,2) not null,
    payment_date date not null default current_date,
    payment_method varchar(30) not null check (payment_method in ('upi', 'net_banking', 'card', 'cash', 'bank_transfer')),
    transaction_id varchar(100),
    status varchar(30) not null default 'pending' check (status in ('pending', 'cleared', 'failed', 'refunded')),
    reconciliation_status varchar(30) not null default 'pending' check (reconciliation_status in ('pending', 'reconciled')),
    reconciled_by uuid references public.employees(id) on delete set null,
    reconciled_at timestamptz,
    created_at timestamptz not null default now()
);

create table public.credit_notes (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references public.invoices(id) on delete cascade,
    credit_note_number varchar(50) not null unique,
    amount numeric(15,2) not null,
    reason text not null,
    status varchar(30) not null default 'active' check (status in ('active', 'void')),
    created_at timestamptz not null default now(),
    created_by uuid references public.users(id) on delete set null
);

create table public.debit_notes (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references public.invoices(id) on delete cascade,
    debit_note_number varchar(50) not null unique,
    amount numeric(15,2) not null,
    reason text not null,
    status varchar(30) not null default 'active' check (status in ('active', 'void')),
    created_at timestamptz not null default now(),
    created_by uuid references public.users(id) on delete set null
);

create table public.refunds (
    id uuid primary key default gen_random_uuid(),
    payment_id uuid not null references public.payments(id) on delete restrict,
    refund_number varchar(50) not null unique,
    amount numeric(15,2) not null,
    reason text not null,
    refund_date date not null default current_date,
    status varchar(30) not null default 'pending' check (status in ('pending', 'completed', 'failed')),
    approved_by uuid references public.employees(id) on delete set null,
    created_at timestamptz not null default now()
);

create table public.general_ledger (
    id uuid primary key default gen_random_uuid(),
    branch_id uuid not null references public.branches(id) on delete restrict,
    account_code varchar(30) not null,
    account_name varchar(100) not null,
    transaction_type varchar(10) not null check (transaction_type in ('debit', 'credit')),
    amount numeric(15,2) not null,
    reference_type varchar(30) not null check (reference_type in ('invoice', 'payment', 'refund', 'journal')),
    reference_id uuid not null,
    entry_date date not null default current_date,
    description text,
    created_at timestamptz not null default now()
);

-- 13. Notifications & Communication
create table public.notification_templates (
    id uuid primary key default gen_random_uuid(),
    name varchar(100) not null unique,
    code varchar(50) not null unique,
    channel varchar(20) not null check (channel in ('email', 'sms', 'whatsapp', 'push', 'in_app')),
    subject_template text,
    body_template text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid not null references public.users(id) on delete cascade,
    template_id uuid references public.notification_templates(id) on delete set null,
    channel varchar(20) not null check (channel in ('email', 'sms', 'whatsapp', 'push', 'in_app')),
    subject varchar(200),
    body text not null,
    status varchar(20) not null default 'pending' check (status in ('pending', 'sent', 'failed', 'read')),
    send_after timestamptz,
    sent_at timestamptz,
    read_at timestamptz,
    error_message text,
    retry_count integer not null default 0,
    created_at timestamptz not null default now()
);

create table public.queries (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    task_id uuid references public.tasks(id) on delete set null,
    raised_by uuid not null references public.users(id) on delete restrict,
    assigned_to uuid references public.users(id) on delete set null,
    subject varchar(150) not null,
    query_text text not null,
    status varchar(30) not null default 'open' check (status in ('open', 'answered', 'resolved', 'closed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.query_responses (
    id uuid primary key default gen_random_uuid(),
    query_id uuid not null references public.queries(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete restrict,
    response_text text not null,
    created_at timestamptz not null default now()
);

create table public.chat_messages (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    employee_id uuid references public.employees(id) on delete set null,
    sender_type varchar(20) not null check (sender_type in ('client', 'employee')),
    message_text text not null,
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);

-- 14. CMS & Website CMS Tables
create table public.blogs (
    id uuid primary key default gen_random_uuid(),
    title varchar(200) not null,
    slug varchar(200) not null unique,
    summary text,
    content text not null,
    featured_image text,
    meta_title varchar(150),
    meta_description varchar(255),
    status varchar(20) not null default 'draft' check (status in ('draft', 'scheduled', 'published')),
    published_at timestamptz,
    author_id uuid references public.employees(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.downloads (
    id uuid primary key default gen_random_uuid(),
    title varchar(150) not null,
    file_path text not null,
    file_size bigint not null,
    description text,
    download_count integer not null default 0,
    is_public boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.careers (
    id uuid primary key default gen_random_uuid(),
    job_title varchar(100) not null,
    department varchar(50) not null,
    location varchar(100) not null,
    description text not null,
    requirements text not null,
    status varchar(20) not null default 'open' check (status in ('open', 'closed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.career_applications (
    id uuid primary key default gen_random_uuid(),
    career_id uuid not null references public.careers(id) on delete cascade,
    applicant_name varchar(150) not null,
    applicant_email citext not null,
    applicant_phone varchar(20) not null,
    resume_path text not null,
    cover_letter text,
    status varchar(30) not null default 'applied' check (status in ('applied', 'reviewing', 'interviewed', 'offered', 'rejected')),
    created_at timestamptz not null default now()
);

create table public.website_settings (
    id uuid primary key default gen_random_uuid(),
    key varchar(100) not null unique,
    value jsonb not null,
    updated_at timestamptz not null default now()
);

-- 15. Activity Log & Audit Trail Table
create table public.activity_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete set null,
    action varchar(50) not null,
    entity_name varchar(100) not null,
    entity_id uuid not null,
    old_values jsonb,
    new_values jsonb,
    ip_address varchar(45),
    user_agent text,
    created_at timestamptz not null default now()
);
