-- 20260721000006_missing_modules.sql
-- Tables required by documented modules that the initial schema omitted:
-- Reports, Contact Requests, Settings, Accounting (chart of accounts, journal
-- vouchers, bank reconciliation), Payroll attendance, and effective-dated
-- statutory payroll rates.

-- ============================================================
-- 1. SYSTEM SETTINGS  (TRD §7 "Settings")
--    Distinct from website_settings, which is public CMS content.
-- ============================================================
create table if not exists public.app_settings (
    id           uuid primary key default gen_random_uuid(),
    key          varchar(100) not null unique,
    value        jsonb not null,
    category     varchar(50) not null default 'general',
    description  text,
    is_sensitive boolean not null default false,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    updated_by   uuid references public.users(id) on delete set null
);
create index if not exists idx_app_settings_category on public.app_settings(category);

-- ============================================================
-- 2. CONTACT REQUESTS  (TRD §7, homepage contact form)
-- ============================================================
create table if not exists public.contact_requests (
    id            uuid primary key default gen_random_uuid(),
    name          varchar(150) not null,
    email         citext not null,
    phone         varchar(20),
    subject       varchar(200),
    message       text not null,
    service_id    uuid references public.services(id) on delete set null,
    source        varchar(50) not null default 'website',
    status        varchar(30) not null default 'new'
                  check (status in ('new', 'contacted', 'converted', 'closed', 'spam')),
    lead_id       uuid references public.leads(id) on delete set null,
    handled_by    uuid references public.employees(id) on delete set null,
    handled_at    timestamptz,
    ip_address    varchar(45),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);
create index if not exists idx_contact_status on public.contact_requests(status, created_at desc);

-- ============================================================
-- 3. REPORTS  (TRD §7 "Reports")
--    Registry of generated artefacts; the file itself lives in storage.
-- ============================================================
create table if not exists public.report_templates (
    id          uuid primary key default gen_random_uuid(),
    name        varchar(150) not null unique,
    code        varchar(50) not null unique,
    module      varchar(50) not null,
    description text,
    parameters  jsonb not null default '{}',
    output_formats text[] not null default '{pdf}',
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create table if not exists public.reports (
    id            uuid primary key default gen_random_uuid(),
    template_id   uuid references public.report_templates(id) on delete set null,
    client_id     uuid references public.clients(id) on delete cascade,
    branch_id     uuid references public.branches(id) on delete restrict,
    title         varchar(200) not null,
    report_type   varchar(50) not null,
    parameters    jsonb not null default '{}',
    period_start  date,
    period_end    date,
    format        varchar(10) not null default 'pdf' check (format in ('pdf', 'xlsx', 'csv')),
    status        varchar(30) not null default 'queued'
                  check (status in ('queued', 'generating', 'ready', 'failed', 'expired')),
    file_path     text,
    file_size     bigint,
    error_message text,
    generated_at  timestamptz,
    expires_at    timestamptz,
    is_shared_with_client boolean not null default false,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    created_by    uuid references public.users(id) on delete set null
);
create index if not exists idx_reports_client on public.reports(client_id, created_at desc);
create index if not exists idx_reports_status on public.reports(status) where status in ('queued', 'generating');
create index if not exists idx_reports_branch on public.reports(branch_id);

-- ============================================================
-- 4. ACCOUNTING  (Accountant dashboard: vouchers, ledger, trial balance,
--    bank reconciliation, financial statements)
-- ============================================================
create table if not exists public.ledger_accounts (
    id            uuid primary key default gen_random_uuid(),
    client_id     uuid references public.clients(id) on delete cascade,
    parent_id     uuid references public.ledger_accounts(id) on delete restrict,
    account_code  varchar(30) not null,
    account_name  varchar(150) not null,
    account_type  varchar(30) not null
                  check (account_type in ('asset', 'liability', 'equity', 'income', 'expense')),
    account_group varchar(100),
    -- Which side increases this account. Prevents sign errors in reporting.
    normal_balance varchar(10) not null check (normal_balance in ('debit', 'credit')),
    is_active     boolean not null default true,
    opening_balance numeric(15,2) not null default 0.00,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    deleted_at    timestamptz,
    created_by    uuid references public.users(id) on delete set null,
    updated_by    uuid references public.users(id) on delete set null,
    deleted_by    uuid references public.users(id) on delete set null,
    unique (client_id, account_code)
);
create index if not exists idx_ledger_accounts_client on public.ledger_accounts(client_id) where deleted_at is null;
create index if not exists idx_ledger_accounts_type on public.ledger_accounts(account_type);

create table if not exists public.journal_vouchers (
    id             uuid primary key default gen_random_uuid(),
    client_id      uuid not null references public.clients(id) on delete cascade,
    branch_id      uuid not null references public.branches(id) on delete restrict,
    voucher_number varchar(50) not null unique,
    voucher_type   varchar(30) not null
                   check (voucher_type in ('journal', 'payment', 'receipt', 'contra', 'sales', 'purchase', 'credit_note', 'debit_note')),
    voucher_date   date not null default current_date,
    narration      text,
    reference      varchar(100),
    total_debit    numeric(15,2) not null default 0.00,
    total_credit   numeric(15,2) not null default 0.00,
    status         varchar(30) not null default 'draft'
                   check (status in ('draft', 'posted', 'reversed')),
    posted_at      timestamptz,
    posted_by      uuid references public.employees(id) on delete set null,
    reversed_by_voucher_id uuid references public.journal_vouchers(id) on delete set null,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    deleted_at     timestamptz,
    created_by     uuid references public.users(id) on delete set null,
    updated_by     uuid references public.users(id) on delete set null,
    deleted_by     uuid references public.users(id) on delete set null,
    -- A posted voucher must balance. Draft rows may be lopsided while editing.
    constraint chk_voucher_balanced check (status <> 'posted' or total_debit = total_credit)
);
create index if not exists idx_vouchers_client_date on public.journal_vouchers(client_id, voucher_date desc);
create index if not exists idx_vouchers_status on public.journal_vouchers(status);

create table if not exists public.journal_voucher_lines (
    id           uuid primary key default gen_random_uuid(),
    voucher_id   uuid not null references public.journal_vouchers(id) on delete cascade,
    account_id   uuid not null references public.ledger_accounts(id) on delete restrict,
    line_number  integer not null,
    debit_amount  numeric(15,2) not null default 0.00,
    credit_amount numeric(15,2) not null default 0.00,
    narration    text,
    created_at   timestamptz not null default now(),
    -- Exactly one side of each line carries a value.
    constraint chk_line_single_side check (
        (debit_amount > 0 and credit_amount = 0) or (credit_amount > 0 and debit_amount = 0)
    ),
    unique (voucher_id, line_number)
);
create index if not exists idx_voucher_lines_voucher on public.journal_voucher_lines(voucher_id);
create index if not exists idx_voucher_lines_account on public.journal_voucher_lines(account_id);

create table if not exists public.bank_transactions (
    id             uuid primary key default gen_random_uuid(),
    client_id      uuid not null references public.clients(id) on delete cascade,
    account_id     uuid references public.ledger_accounts(id) on delete set null,
    transaction_date date not null,
    value_date     date,
    description    text not null,
    reference      varchar(100),
    debit_amount   numeric(15,2) not null default 0.00,
    credit_amount  numeric(15,2) not null default 0.00,
    running_balance numeric(15,2),
    -- Hash of the source row; makes re-importing a statement idempotent.
    import_hash    varchar(64) not null,
    reconciliation_status varchar(30) not null default 'unreconciled'
                   check (reconciliation_status in ('unreconciled', 'matched', 'manual', 'ignored')),
    matched_voucher_id uuid references public.journal_vouchers(id) on delete set null,
    reconciled_by  uuid references public.employees(id) on delete set null,
    reconciled_at  timestamptz,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    unique (client_id, import_hash)
);
create index if not exists idx_bank_txn_client_date on public.bank_transactions(client_id, transaction_date desc);
create index if not exists idx_bank_txn_unreconciled on public.bank_transactions(client_id)
    where reconciliation_status = 'unreconciled';

-- ============================================================
-- 5. PAYROLL: attendance + effective-dated statutory rates
--    Rates are data, never constants in code: they change every budget and
--    Professional Tax differs by state.
-- ============================================================
create table if not exists public.payroll_attendance (
    id                   uuid primary key default gen_random_uuid(),
    employee_profile_id  uuid not null references public.employee_payroll_profiles(id) on delete cascade,
    period_month         integer not null check (period_month between 1 and 12),
    period_year          integer not null,
    working_days         numeric(4,1) not null,
    present_days         numeric(4,1) not null,
    paid_leave_days      numeric(4,1) not null default 0.0,
    lwp_days             numeric(4,1) not null default 0.0,
    overtime_hours       numeric(6,2) not null default 0.00,
    source               varchar(30) not null default 'manual'
                         check (source in ('manual', 'import', 'biometric')),
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now(),
    created_by           uuid references public.users(id) on delete set null,
    unique (employee_profile_id, period_year, period_month),
    constraint chk_attendance_days check (present_days + paid_leave_days + lwp_days <= working_days + 1)
);
create index if not exists idx_attendance_period on public.payroll_attendance(period_year, period_month);

create table if not exists public.payroll_statutory_config (
    id             uuid primary key default gen_random_uuid(),
    financial_year varchar(10) not null,
    -- NULL state_code = national default; a state row overrides it.
    state_code     varchar(10),
    component      varchar(30) not null
                   check (component in ('pf', 'eps', 'esi', 'professional_tax', 'tds', 'gratuity', 'lwf')),
    -- Slab-based components (PT, TDS) carry their bands here; flat-rate
    -- components use employee_rate / employer_rate.
    employee_rate  numeric(6,3),
    employer_rate  numeric(6,3),
    wage_ceiling   numeric(15,2),
    wage_floor     numeric(15,2),
    slabs          jsonb not null default '[]',
    effective_from date not null,
    effective_to   date,
    is_active      boolean not null default true,
    notes          text,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    updated_by     uuid references public.users(id) on delete set null,
    constraint chk_statutory_period check (effective_to is null or effective_to >= effective_from)
);
create unique index if not exists uq_statutory_active
    on public.payroll_statutory_config (financial_year, component, coalesce(state_code, ''), effective_from);
create index if not exists idx_statutory_lookup
    on public.payroll_statutory_config (component, effective_from desc) where is_active = true;

-- ============================================================
-- 6. TRIGGERS
-- ============================================================
create trigger trg_app_settings_updated_at before update on public.app_settings
  for each row execute procedure public.update_updated_at_column();
create trigger trg_contact_requests_updated_at before update on public.contact_requests
  for each row execute procedure public.update_updated_at_column();
create trigger trg_report_templates_updated_at before update on public.report_templates
  for each row execute procedure public.update_updated_at_column();
create trigger trg_reports_updated_at before update on public.reports
  for each row execute procedure public.update_updated_at_column();
create trigger trg_ledger_accounts_updated_at before update on public.ledger_accounts
  for each row execute procedure public.update_updated_at_column();
create trigger trg_journal_vouchers_updated_at before update on public.journal_vouchers
  for each row execute procedure public.update_updated_at_column();
create trigger trg_bank_transactions_updated_at before update on public.bank_transactions
  for each row execute procedure public.update_updated_at_column();
create trigger trg_payroll_attendance_updated_at before update on public.payroll_attendance
  for each row execute procedure public.update_updated_at_column();
create trigger trg_payroll_statutory_updated_at before update on public.payroll_statutory_config
  for each row execute procedure public.update_updated_at_column();

create trigger trg_ledger_accounts_soft_delete before delete on public.ledger_accounts
  for each row execute procedure public.soft_delete_record();
create trigger trg_journal_vouchers_soft_delete before delete on public.journal_vouchers
  for each row execute procedure public.soft_delete_record();

create trigger trg_vouchers_audit after insert or update or delete on public.journal_vouchers
  for each row execute procedure public.log_activity_event();

-- Voucher numbering, race-free like the invoice sequence.
create or replace function public.generate_voucher_number_func()
returns trigger as $$
declare fy varchar;
begin
  if new.voucher_number is null or new.voucher_number = '' then
    fy := public.financial_year_code(coalesce(new.voucher_date, current_date));
    new.voucher_number := upper(left(new.voucher_type, 3)) || '-' || fy || '-'
      || to_char(public.next_document_number('voucher:' || new.voucher_type || ':' || fy), 'FM00000');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_vouchers_generate_number before insert on public.journal_vouchers
  for each row execute procedure public.generate_voucher_number_func();

-- Keep voucher totals in step with their lines.
create or replace function public.sync_voucher_totals()
returns trigger as $$
declare
  v_id uuid := coalesce(new.voucher_id, old.voucher_id);
begin
  update public.journal_vouchers v
     set total_debit  = coalesce((select sum(debit_amount)  from public.journal_voucher_lines where voucher_id = v_id), 0),
         total_credit = coalesce((select sum(credit_amount) from public.journal_voucher_lines where voucher_id = v_id), 0)
   where v.id = v_id;
  return null;
end;
$$ language plpgsql;

create trigger trg_voucher_lines_sync_totals
  after insert or update or delete on public.journal_voucher_lines
  for each row execute procedure public.sync_voucher_totals();

-- ============================================================
-- 7. RLS
-- ============================================================
alter table public.app_settings             enable row level security;
alter table public.contact_requests         enable row level security;
alter table public.report_templates         enable row level security;
alter table public.reports                  enable row level security;
alter table public.ledger_accounts          enable row level security;
alter table public.journal_vouchers         enable row level security;
alter table public.journal_voucher_lines    enable row level security;
alter table public.bank_transactions        enable row level security;
alter table public.payroll_attendance       enable row level security;
alter table public.payroll_statutory_config enable row level security;

-- Settings: non-sensitive readable by staff, writes admin-only.
create policy "staff_read_non_sensitive" on public.app_settings for select to authenticated
  using (public.is_staff() and is_sensitive = false);
create policy "admin_manage" on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Anyone may submit the website contact form; only staff may read it.
create policy "public_submit" on public.contact_requests for insert to anon, authenticated with check (true);
create policy "staff_read" on public.contact_requests for select to authenticated using (public.is_staff());
create policy "staff_manage" on public.contact_requests for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "staff_read" on public.report_templates for select to authenticated using (public.is_staff());
create policy "admin_manage" on public.report_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- A client sees a report only once it has been shared with them.
create policy "read_scope" on public.reports for select to authenticated
  using (
    public.can_access_client(client_id)
    and (public.is_staff() or is_shared_with_client = true)
  );
create policy "staff_manage" on public.reports for all to authenticated
  using (public.is_staff() and public.can_access_client(client_id))
  with check (public.is_staff() and public.can_access_client(client_id));

create policy "client_scope_read" on public.ledger_accounts for select to authenticated
  using (public.can_access_client(client_id));
create policy "accounting_write" on public.ledger_accounts for all to authenticated
  using (public.get_current_user_role() in ('super_admin','managing_partner','accountant','chartered_accountant'))
  with check (public.get_current_user_role() in ('super_admin','managing_partner','accountant','chartered_accountant'));

create policy "client_scope_read" on public.journal_vouchers for select to authenticated
  using (public.can_access_client(client_id));
create policy "accounting_write" on public.journal_vouchers for all to authenticated
  using (public.get_current_user_role() in ('super_admin','managing_partner','accountant','chartered_accountant'))
  with check (public.get_current_user_role() in ('super_admin','managing_partner','accountant','chartered_accountant'));

create policy "scope_via_voucher" on public.journal_voucher_lines for select to authenticated
  using (exists (select 1 from public.journal_vouchers v
                 where v.id = voucher_id and public.can_access_client(v.client_id)));
create policy "accounting_write" on public.journal_voucher_lines for all to authenticated
  using (public.get_current_user_role() in ('super_admin','managing_partner','accountant','chartered_accountant'))
  with check (public.get_current_user_role() in ('super_admin','managing_partner','accountant','chartered_accountant'));

create policy "client_scope_read" on public.bank_transactions for select to authenticated
  using (public.can_access_client(client_id));
create policy "accounting_write" on public.bank_transactions for all to authenticated
  using (public.get_current_user_role() in ('super_admin','managing_partner','accountant','chartered_accountant'))
  with check (public.get_current_user_role() in ('super_admin','managing_partner','accountant','chartered_accountant'));

create policy "payroll_access" on public.payroll_attendance for all to authenticated
  using (public.get_current_user_role() in ('super_admin','managing_partner','payroll_executive','accountant'))
  with check (public.get_current_user_role() in ('super_admin','managing_partner','payroll_executive','accountant'));

-- Statutory rates are readable by staff (payslips explain their deductions)
-- but only an administrator may change them.
create policy "staff_read" on public.payroll_statutory_config for select to authenticated
  using (public.is_staff());
create policy "admin_manage" on public.payroll_statutory_config for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 8. SEED: statutory rates, FY 2025-26.
--    Values are seeded as DATA so they can be corrected by an administrator
--    without a code change. Verify against the current Finance Act before use.
-- ============================================================
insert into public.payroll_statutory_config
  (financial_year, state_code, component, employee_rate, employer_rate, wage_ceiling, effective_from, notes)
values
  ('2025-26', null, 'pf',  12.000, 3.670, 15000.00, '2025-04-01', 'Employee 12%; employer 3.67% to PF after EPS split'),
  ('2025-26', null, 'eps', 0.000,  8.330, 15000.00, '2025-04-01', 'Employer pension share, capped at the wage ceiling'),
  ('2025-26', null, 'esi', 0.750,  3.250, 21000.00, '2025-04-01', 'Applicable where gross wages are at or below the ceiling')
on conflict do nothing;

insert into public.payroll_statutory_config
  (financial_year, state_code, component, slabs, effective_from, notes)
values
  ('2025-26', 'TS', 'professional_tax',
   '[{"from":0,"to":15000,"amount":0},{"from":15001,"to":20000,"amount":150},{"from":20001,"to":null,"amount":200}]',
   '2025-04-01', 'Telangana monthly PT slabs'),
  ('2025-26', 'AP', 'professional_tax',
   '[{"from":0,"to":15000,"amount":0},{"from":15001,"to":20000,"amount":150},{"from":20001,"to":null,"amount":200}]',
   '2025-04-01', 'Andhra Pradesh monthly PT slabs'),
  ('2025-26', 'KA', 'professional_tax',
   '[{"from":0,"to":24999,"amount":0},{"from":25000,"to":null,"amount":200}]',
   '2025-04-01', 'Karnataka monthly PT slabs'),
  ('2025-26', 'TN', 'professional_tax',
   '[{"from":0,"to":21000,"amount":0},{"from":21001,"to":30000,"amount":135},{"from":30001,"to":45000,"amount":315},{"from":45001,"to":60000,"amount":690},{"from":60001,"to":75000,"amount":1025},{"from":75001,"to":null,"amount":1250}]',
   '2025-04-01', 'Tamil Nadu half-yearly slabs, expressed monthly'),
  ('2025-26', 'MH', 'professional_tax',
   '[{"from":0,"to":7500,"amount":0},{"from":7501,"to":10000,"amount":175},{"from":10001,"to":null,"amount":200}]',
   '2025-04-01', 'Maharashtra monthly PT slabs; February differs, handled in code')
on conflict do nothing;

-- Chart of accounts codes referenced by the payment posting trigger.
insert into public.app_settings (key, value, category, description) values
  ('accounting.control_accounts',
   '{"bank":"1100","accounts_receivable":"1200","sales":"4000","gst_output":"2200","gst_input":"1300","rounding":"9999"}',
   'accounting',
   'Control account codes used when the system posts automatic ledger entries'),
  ('payroll.default_state_code', '"TS"', 'payroll',
   'Fallback state for Professional Tax when a client entity has no state on file'),
  ('compliance.reminder_days', '[30, 15, 7, 3, 1]', 'compliance',
   'Days before a due date on which reminder notifications are queued')
on conflict (key) do nothing;
