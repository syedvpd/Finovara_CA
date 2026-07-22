-- 20260721000007_seed_reference_data.sql
-- Reference data the application needs to be operable, plus the Testimonials
-- module required by the PRD and homepage wireframe (section 11).

-- ============================================================
-- 1. TESTIMONIALS (PRD module; homepage §11)
-- ============================================================
create table if not exists public.testimonials (
    id            uuid primary key default gen_random_uuid(),
    client_id     uuid references public.clients(id) on delete set null,
    author_name   varchar(150) not null,
    author_role   varchar(150),
    company_name  varchar(150),
    avatar_url    text,
    rating        integer not null default 5 check (rating between 1 and 5),
    quote         text not null,
    service_id    uuid references public.services(id) on delete set null,
    is_featured   boolean not null default false,
    status        varchar(20) not null default 'draft'
                  check (status in ('draft', 'published', 'archived')),
    display_order integer not null default 0,
    published_at  timestamptz,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    created_by    uuid references public.users(id) on delete set null,
    updated_by    uuid references public.users(id) on delete set null
);
create index if not exists idx_testimonials_published
    on public.testimonials(status, display_order) where status = 'published';

create trigger trg_testimonials_updated_at before update on public.testimonials
  for each row execute procedure public.update_updated_at_column();

alter table public.testimonials enable row level security;

create policy "public_read_published" on public.testimonials for select to anon, authenticated
  using (status = 'published');
create policy "staff_manage" on public.testimonials for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- 2. SERVICE CATALOGUE (the 10 services on the homepage)
-- ============================================================
insert into public.services (name, code, description, department, base_price, billing_cycle) values
  ('Income Tax Services',   'INCOME_TAX',     'ITR preparation, filing, assessments, refunds and notice handling.', 'Taxation',   15000.00, 'annually'),
  ('GST Services',          'GST',            'Registration, monthly and annual returns, reconciliation and advisory.', 'GST',       25000.00, 'monthly'),
  ('Audit & Assurance',     'AUDIT',          'Statutory, internal, tax, stock and concurrent audit engagements.',   'Audit',      75000.00, 'annually'),
  ('Accounting & Bookkeeping','ACCOUNTING',   'Voucher entry, ledgers, reconciliation and financial statements.',    'Accounting', 18000.00, 'monthly'),
  ('Compliance Management', 'COMPLIANCE',     'ROC, MCA and statutory compliance calendar management.',              'Compliance', 20000.00, 'annually'),
  ('Payroll Processing',    'PAYROLL',        'Salary computation, statutory deductions and payslip generation.',    'Payroll',    12000.00, 'monthly'),
  ('Virtual CFO',           'VIRTUAL_CFO',    'Strategic finance leadership, MIS, budgeting and cash-flow advisory.','Advisory',  100000.00, 'monthly'),
  ('Startup Advisory',      'STARTUP',        'Incorporation, funding readiness, ESOP and regulatory structuring.',  'Advisory',   50000.00, 'one_time'),
  ('Due Diligence',         'DUE_DILIGENCE',  'Financial and tax due diligence for transactions and investments.',   'Advisory',  150000.00, 'one_time'),
  ('Risk & Controls',       'RISK_CONTROLS',  'Internal financial controls design, testing and risk assessment.',    'Audit',      80000.00, 'annually')
on conflict (code) do update set
  description = excluded.description, department = excluded.department;

-- ============================================================
-- 3. COMPLIANCE TYPES (drive the compliance calendar)
-- ============================================================
insert into public.compliance_types (name, description, authority, frequency) values
  ('GSTR-1 Filing',            'Outward supplies return',                       'gst',        'monthly'),
  ('GSTR-3B Filing',           'Summary return and tax payment',                'gst',        'monthly'),
  ('GSTR-9 Annual Return',     'Annual GST return',                             'gst',        'annually'),
  ('GSTR-9C Reconciliation',   'Audited reconciliation statement',              'gst',        'annually'),
  ('Income Tax Return',        'Annual income tax return filing',               'income_tax', 'annually'),
  ('Advance Tax Instalment',   'Quarterly advance tax payment',                 'income_tax', 'quarterly'),
  ('TDS Return (24Q/26Q)',     'Quarterly TDS statement',                       'income_tax', 'quarterly'),
  ('TDS Payment',              'Monthly TDS deposit',                           'income_tax', 'monthly'),
  ('Tax Audit (44AB)',         'Tax audit report filing',                       'income_tax', 'annually'),
  ('PF Return & Payment',      'Monthly provident fund remittance',             'pf_esi',     'monthly'),
  ('ESI Return & Payment',     'Monthly employee state insurance remittance',   'pf_esi',     'monthly'),
  ('Professional Tax',         'Monthly professional tax remittance',           'other',      'monthly'),
  ('ROC Annual Filing (AOC-4)','Annual financial statement filing',             'mca',        'annually'),
  ('ROC Annual Return (MGT-7)','Annual return filing',                          'mca',        'annually'),
  ('DIR-3 KYC',                'Director KYC filing',                           'mca',        'annually')
on conflict (name) do update set description = excluded.description;

-- Due-date rules consumed by the reminder engine.
insert into public.compliance_rules (compliance_type_id, due_date_formula, penalty_formula, warning_days_before)
select id,
  case name
    when 'GSTR-1 Filing'          then '{"type":"day_of_next_month","day":11}'::jsonb
    when 'GSTR-3B Filing'         then '{"type":"day_of_next_month","day":20}'::jsonb
    when 'TDS Payment'            then '{"type":"day_of_next_month","day":7}'::jsonb
    when 'PF Return & Payment'    then '{"type":"day_of_next_month","day":15}'::jsonb
    when 'ESI Return & Payment'   then '{"type":"day_of_next_month","day":15}'::jsonb
    when 'Professional Tax'       then '{"type":"day_of_next_month","day":10}'::jsonb
    when 'Income Tax Return'      then '{"type":"fixed_date","month":7,"day":31}'::jsonb
    when 'Tax Audit (44AB)'       then '{"type":"fixed_date","month":9,"day":30}'::jsonb
    when 'GSTR-9 Annual Return'   then '{"type":"fixed_date","month":12,"day":31}'::jsonb
    when 'GSTR-9C Reconciliation' then '{"type":"fixed_date","month":12,"day":31}'::jsonb
    when 'ROC Annual Filing (AOC-4)' then '{"type":"fixed_date","month":10,"day":30}'::jsonb
    when 'ROC Annual Return (MGT-7)' then '{"type":"fixed_date","month":11,"day":29}'::jsonb
    when 'DIR-3 KYC'              then '{"type":"fixed_date","month":9,"day":30}'::jsonb
    when 'Advance Tax Instalment' then '{"type":"quarterly","days":[15]}'::jsonb
    else '{"type":"day_of_next_month","day":15}'::jsonb
  end,
  '{"per_day":50,"cap":5000}'::jsonb,
  7
from public.compliance_types
where not exists (select 1 from public.compliance_rules r where r.compliance_type_id = public.compliance_types.id);

-- ============================================================
-- 4. NOTIFICATION TEMPLATES
--    $placeholders are substituted by the dispatch worker.
-- ============================================================
insert into public.notification_templates (name, code, channel, subject_template, body_template) values
  ('Compliance Due Reminder', 'compliance_reminder', 'email',
   'Reminder: $compliance_name due on $due_date',
   'Dear $client_name,

This is a reminder that $compliance_name is due on $due_date.

Please ensure all supporting documents are uploaded to your portal so we can complete the filing on time.

Regards,
Finovara Chartered Accountants LLP'),

  ('Document Requested', 'document_requested', 'email',
   'Action required: documents needed for $service_name',
   'Dear $client_name,

We need the following to proceed with $service_name:

$document_list

Please upload them via your client portal at your earliest convenience.

Regards,
Finovara Chartered Accountants LLP'),

  ('Document Verified', 'document_verified', 'in_app', 'Document verified',
   'Your document "$document_name" has been verified by $verified_by.'),

  ('Document Rejected', 'document_rejected', 'email',
   'Document requires resubmission: $document_name',
   'Dear $client_name,

The document "$document_name" could not be accepted for the following reason:

$reason

Please upload a corrected version through your portal.

Regards,
Finovara Chartered Accountants LLP'),

  ('Invoice Issued', 'invoice_issued', 'email',
   'Invoice $invoice_number from Finovara',
   'Dear $client_name,

Invoice $invoice_number for $amount has been raised and is due on $due_date.

You can view and settle it from your client portal.

Regards,
Finovara Chartered Accountants LLP'),

  ('Invoice Overdue', 'invoice_overdue', 'email',
   'Overdue: Invoice $invoice_number',
   'Dear $client_name,

Invoice $invoice_number for $amount was due on $due_date and remains outstanding.

Please arrange settlement at your earliest convenience.

Regards,
Finovara Chartered Accountants LLP'),

  ('Payment Received', 'payment_received', 'email',
   'Payment received — thank you',
   'Dear $client_name,

We have received your payment of $amount against invoice $invoice_number.

Thank you.

Finovara Chartered Accountants LLP'),

  ('Return Filed', 'return_filed', 'email',
   '$return_type filed successfully',
   'Dear $client_name,

Your $return_type for $period has been filed successfully.

Acknowledgement number: $acknowledgement_number

The acknowledgement is available in your document vault.

Regards,
Finovara Chartered Accountants LLP'),

  ('Task Assigned', 'task_assigned', 'in_app', 'New task assigned',
   'You have been assigned "$task_title" for $client_name. Due: $due_date.'),

  ('Query Answered', 'query_answered', 'in_app', 'Your query has a reply',
   'Your query "$subject" has been answered by the Finovara team.'),

  ('Report Ready', 'report_ready', 'in_app', 'Report ready',
   'Your report "$report_title" has been generated and is ready to download.'),

  ('Audit Observation Raised', 'audit_observation', 'email',
   'Audit observation requires your response',
   'Dear $client_name,

An observation has been raised during your $audit_type audit:

$observation_title
Risk level: $risk_level

Please submit a management response through your portal.

Regards,
Finovara Chartered Accountants LLP'),

  ('Welcome', 'client_welcome', 'email',
   'Welcome to the Finovara client portal',
   'Dear $client_name,

Your client portal account is now active.

You can upload documents, track compliance, view invoices and message your consultant at any time.

Regards,
Finovara Chartered Accountants LLP')
on conflict (code) do update set
  subject_template = excluded.subject_template, body_template = excluded.body_template;

-- ============================================================
-- 5. REPORT TEMPLATES
-- ============================================================
insert into public.report_templates (name, code, module, description, parameters, output_formats) values
  ('Client Compliance Statement', 'client_compliance', 'compliance',
   'Compliance obligations, filing status and upcoming due dates for a client.',
   '{"client_id":"uuid","period_start":"date","period_end":"date"}', '{pdf,xlsx}'),
  ('Invoice',                     'invoice_pdf',      'invoices',
   'Printable tax invoice with line items and GST breakdown.',
   '{"invoice_id":"uuid"}', '{pdf}'),
  ('Payslip',                     'payslip_pdf',      'payroll',
   'Employee payslip with earnings and statutory deductions.',
   '{"payroll_record_id":"uuid"}', '{pdf}'),
  ('Payroll Register',            'payroll_register', 'payroll',
   'All payslips in a payroll run with employer cost totals.',
   '{"payroll_run_id":"uuid"}', '{pdf,xlsx}'),
  ('Trial Balance',               'trial_balance',    'accounting',
   'Account-wise debit and credit totals as at a date.',
   '{"client_id":"uuid","as_of":"date"}', '{pdf,xlsx}'),
  ('GST Summary',                 'gst_summary',      'gst',
   'Output tax, input credit and net liability by period.',
   '{"client_id":"uuid","period_year":"integer"}', '{pdf,xlsx}'),
  ('Receivables Ageing',          'receivables_ageing','invoices',
   'Outstanding invoices bucketed by age.',
   '{"branch_id":"uuid","as_of":"date"}', '{pdf,xlsx}'),
  ('Audit Report',                'audit_report',     'audit',
   'Audit observations, risk ratings and management responses.',
   '{"audit_id":"uuid"}', '{pdf}'),
  ('Firm Performance',            'firm_performance', 'analytics',
   'Revenue, collections and workload by branch.',
   '{"period_start":"date","period_end":"date"}', '{pdf,xlsx}')
on conflict (code) do update set description = excluded.description;

-- ============================================================
-- 6. WEBSITE + APPLICATION SETTINGS
-- ============================================================
insert into public.website_settings (key, value) values
  ('contact', '{"email":"info@finovara.com","phone":"+914012345678","address":"Hyderabad, Telangana, India"}'),
  ('social',  '{"linkedin":"","twitter":"","instagram":"","youtube":"","facebook":""}'),
  ('stats',   '{"clients":1500,"tax_filings":4000,"gst_registrations":750,"audits":500,"retention":96,"professionals":65}'),
  ('office_hours', '{"weekdays":"9:30 AM - 6:30 PM","saturday":"10:00 AM - 2:00 PM","sunday":"Closed"}')
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public.app_settings (key, value, category, description) values
  ('notifications.retry_limit',        '5',       'notifications', 'Attempts before a notification is abandoned'),
  ('notifications.batch_size',         '50',      'notifications', 'Notifications drained per worker cycle'),
  ('reports.retention_days',           '30',      'reports',       'Days a generated report stays downloadable'),
  ('invoices.default_due_days',        '30',      'invoices',      'Default payment terms in days'),
  ('invoices.default_gst_rate',        '18.00',   'invoices',      'Default GST rate applied to invoice lines'),
  ('firm.legal_name',                  '"Finovara Chartered Accountants LLP"', 'firm', 'Name printed on invoices and reports'),
  ('firm.gstin',                       '""',      'firm',          'Firm GSTIN printed on tax invoices'),
  ('firm.pan',                         '""',      'firm',          'Firm PAN'),
  ('firm.registered_address',          '"Hyderabad, Telangana, India"', 'firm', 'Address printed on invoices')
on conflict (key) do nothing;

-- ============================================================
-- 7. TESTIMONIAL CONTENT (homepage §11)
-- ============================================================
insert into public.testimonials (author_name, author_role, company_name, rating, quote, status, is_featured, display_order, published_at) values
  ('Rahul Mehta', 'Managing Director', 'Mehta Industries', 5,
   'Finovara restructured our entire compliance calendar. We have not missed a single filing deadline in three years, and the portal gives us complete visibility.',
   'published', true, 1, now()),
  ('Priya Sharma', 'Founder', 'Greenleaf Organics', 5,
   'The GST advisory team saved us lakhs in penalties through proactive compliance management. Document management is effortless through their portal.',
   'published', true, 2, now()),
  ('Anil Kapoor', 'CFO', 'BuildRight Infrastructure', 5,
   'Outstanding audit quality and turnaround. Their understanding of the construction sector is unmatched. Clients for seven years and counting.',
   'published', true, 3, now())
on conflict do nothing;
