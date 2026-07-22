-- 20260721000009_taxonomy_and_periods.sql
-- Spec tables that were still missing: financial_years and categories, plus a
-- data-driven document taxonomy.
--
-- Document categories were a CHECK constraint with 8 generic values. The spec
-- names 10 specific vault categories, and a firm will want to add more without
-- a migration, so the taxonomy becomes a reference table.

-- ============================================================
-- 1. FINANCIAL YEARS  (period control and locking)
-- ============================================================
create table if not exists public.financial_years (
    id              uuid primary key default gen_random_uuid(),
    code            varchar(10) not null unique,          -- '2025-26'
    label           varchar(50) not null,                 -- 'FY 2025-26'
    assessment_year varchar(10) not null,                 -- '2026-27'
    start_date      date not null,
    end_date        date not null,
    is_current      boolean not null default false,
    -- A locked year rejects new vouchers, invoices and filings, so prior-period
    -- figures cannot move after books are closed.
    is_locked       boolean not null default false,
    locked_at       timestamptz,
    locked_by       uuid references public.users(id) on delete set null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    constraint chk_fy_dates check (end_date > start_date)
);
create index if not exists idx_financial_years_current
    on public.financial_years(is_current) where is_current = true;

-- Exactly one year may be current.
create unique index if not exists uq_financial_year_current
    on public.financial_years((is_current)) where is_current = true;

create trigger trg_financial_years_updated_at before update on public.financial_years
  for each row execute procedure public.update_updated_at_column();

-- Indian FY runs April to March. Seeded from 2020-21 through 2030-31.
insert into public.financial_years (code, label, assessment_year, start_date, end_date, is_current)
select
    y || '-' || right((y + 1)::text, 2),
    'FY ' || y || '-' || right((y + 1)::text, 2),
    (y + 1) || '-' || right((y + 2)::text, 2),
    make_date(y, 4, 1),
    make_date(y + 1, 3, 31),
    -- Current year is the one containing today.
    current_date between make_date(y, 4, 1) and make_date(y + 1, 3, 31)
from generate_series(2020, 2030) as y
on conflict (code) do nothing;

-- ============================================================
-- 2. CATEGORIES  (blog and content taxonomy)
-- ============================================================
create table if not exists public.categories (
    id          uuid primary key default gen_random_uuid(),
    name        varchar(100) not null,
    slug        varchar(120) not null unique,
    description text,
    kind        varchar(30) not null default 'blog'
                check (kind in ('blog', 'download', 'faq', 'service')),
    parent_id   uuid references public.categories(id) on delete set null,
    display_order integer not null default 0,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);
create index if not exists idx_categories_kind on public.categories(kind, display_order);

create trigger trg_categories_updated_at before update on public.categories
  for each row execute procedure public.update_updated_at_column();

-- Blogs gain a category; nullable so existing posts stay valid.
alter table public.blogs add column if not exists category_id uuid
    references public.categories(id) on delete set null;
create index if not exists idx_blogs_category on public.blogs(category_id);

insert into public.categories (name, slug, kind, display_order) values
  ('Income Tax',        'income-tax',        'blog', 1),
  ('GST',               'gst',               'blog', 2),
  ('Audit & Assurance', 'audit-assurance',   'blog', 3),
  ('Accounting',        'accounting',        'blog', 4),
  ('Compliance',        'compliance',        'blog', 5),
  ('Payroll',           'payroll',           'blog', 6),
  ('Startup Advisory',  'startup-advisory',  'blog', 7),
  ('Virtual CFO',       'virtual-cfo',       'blog', 8),
  ('Budget & Policy',   'budget-policy',     'blog', 9),
  ('Firm News',         'firm-news',         'blog', 10)
on conflict (slug) do nothing;

insert into public.categories (name, slug, kind, display_order) values
  ('Tax Forms',         'tax-forms',         'download', 1),
  ('GST Templates',     'gst-templates',     'download', 2),
  ('Compliance Guides', 'compliance-guides', 'download', 3),
  ('Checklists',        'checklists',        'download', 4)
on conflict (slug) do nothing;

-- ============================================================
-- 3. DOCUMENT CATEGORIES  (the 10 vault categories from the spec)
--    Replaces the CHECK constraint so the taxonomy is data, not schema.
-- ============================================================
create table if not exists public.document_categories (
    id            uuid primary key default gen_random_uuid(),
    code          varchar(50) not null unique,
    name          varchar(100) not null,
    description   text,
    bucket        varchar(50) not null default 'client-documents',
    -- Categories the client is expected to supply during onboarding.
    is_kyc        boolean not null default false,
    is_required   boolean not null default false,
    accepted_types text[] not null default '{application/pdf,image/png,image/jpeg}',
    display_order integer not null default 0,
    is_active     boolean not null default true,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);
create index if not exists idx_document_categories_active
    on public.document_categories(display_order) where is_active = true;

create trigger trg_document_categories_updated_at before update on public.document_categories
  for each row execute procedure public.update_updated_at_column();

insert into public.document_categories (code, name, description, bucket, is_kyc, is_required, display_order) values
  ('pan',              'PAN',                       'Permanent Account Number card',        'client-documents', true,  true,  1),
  ('identity',         'Aadhaar / Identity',        'Aadhaar or other government identity', 'client-documents', true,  true,  2),
  ('gst',              'GST Records',               'Registration, returns and challans',   'gst-documents',    false, false, 3),
  ('financial',        'Financial Statements',      'Balance sheet, P&L, schedules',        'client-documents', false, false, 4),
  ('bank',             'Bank Statements',           'Account statements for the period',    'client-documents', false, true,  5),
  ('payroll',          'Payroll Data',              'Salary registers and attendance',      'payroll',          false, false, 6),
  ('agreements',       'Agreements',                'Contracts and engagement letters',     'client-documents', false, false, 7),
  ('audit_evidence',   'Audit Evidence',            'Supporting evidence for audit',        'audit-documents',  false, false, 8),
  ('tax_notices',      'Tax Notices',               'Notices and departmental correspondence','tax-documents',  false, false, 9),
  ('acknowledgements', 'Filing Acknowledgements',   'Filed return acknowledgements',        'tax-documents',    false, false, 10),
  ('report',           'Reports',                   'Generated reports and certificates',   'generated-reports',false, false, 11),
  ('invoice',          'Invoices',                  'Issued invoices and receipts',         'generated-pdfs',   false, false, 12),
  ('general',          'General',                   'Anything not covered above',           'client-documents', false, false, 99)
on conflict (code) do nothing;

-- Widen the constraint so the new codes are accepted. Kept as a guard rather
-- than a foreign key: documents must survive a category being retired.
alter table public.documents drop constraint if exists documents_file_category_check;
alter table public.documents add constraint documents_file_category_check
    check (file_category in (
        'pan','identity','gst','financial','bank','payroll','agreements',
        'audit_evidence','tax_notices','acknowledgements','report','invoice',
        'general','tax','audit','kyc'
    ));

-- ============================================================
-- 4. RLS
-- ============================================================
alter table public.financial_years     enable row level security;
alter table public.categories          enable row level security;
alter table public.document_categories enable row level security;

-- Reference data: readable by everyone, writable by administrators.
create policy "public_read" on public.financial_years for select to anon, authenticated using (true);
create policy "admin_manage" on public.financial_years for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "public_read" on public.categories for select to anon, authenticated
  using (is_active = true or public.is_staff());
create policy "staff_manage" on public.categories for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "public_read" on public.document_categories for select to anon, authenticated
  using (is_active = true);
create policy "admin_manage" on public.document_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 5. PERIOD LOCKING
--    A locked financial year must reject new postings, or closed books can
--    still move. Enforced in the database so it holds regardless of caller.
-- ============================================================
create or replace function public.assert_period_open()
returns trigger as $$
declare
  entry_date date;
  locked boolean;
begin
  entry_date := coalesce(new.voucher_date, new.issue_date, current_date);

  select fy.is_locked into locked
  from public.financial_years fy
  where entry_date between fy.start_date and fy.end_date
  limit 1;

  if locked then
    raise exception 'The financial year covering % is locked and cannot accept new entries.', entry_date
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_vouchers_period_open before insert or update on public.journal_vouchers
  for each row execute procedure public.assert_period_open();

create trigger trg_invoices_period_open before insert on public.invoices
  for each row execute procedure public.assert_period_open();
