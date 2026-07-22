-- 20260721000004_hardening.sql
-- Additive remediation: indexes, race-free numbering, financial integrity, auth lockdown.

-- ============================================================
-- 1. INDEXES (every FK + hot composites + search)
-- ============================================================
create index if not exists idx_users_role_id on public.users(role_id);
create index if not exists idx_users_status on public.users(status) where deleted_at is null;
create index if not exists idx_login_history_user on public.login_history(user_id, logged_in_at desc);
create index if not exists idx_user_sessions_user on public.user_sessions(user_id);
create index if not exists idx_user_sessions_token on public.user_sessions(token_hash);
create index if not exists idx_user_sessions_expires on public.user_sessions(expires_at);

create index if not exists idx_employees_branch on public.employees(branch_id) where deleted_at is null;
create index if not exists idx_employees_user on public.employees(user_id);
create index if not exists idx_eba_branch on public.employee_branch_access(branch_id);

create index if not exists idx_leads_rm on public.leads(assigned_rm_id);
create index if not exists idx_leads_status on public.leads(status, created_at desc);
create index if not exists idx_consultations_lead on public.consultations(lead_id);
create index if not exists idx_consultations_sched on public.consultations(scheduled_at);
create index if not exists idx_proposals_lead on public.proposals(lead_id);

create index if not exists idx_clients_branch on public.clients(branch_id) where deleted_at is null;
create index if not exists idx_clients_rm on public.clients(relationship_manager_id);
create index if not exists idx_clients_user on public.clients(user_id);
create index if not exists idx_client_entities_client on public.client_entities(client_id) where deleted_at is null;
create index if not exists idx_kyc_client on public.client_documents_kyc(client_id, status);

create index if not exists idx_client_services_client on public.client_services(client_id, status);
create index if not exists idx_client_services_service on public.client_services(service_id);
create index if not exists idx_client_services_billing on public.client_services(next_billing_date) where status = 'active';

create index if not exists idx_compliance_rules_type on public.compliance_rules(compliance_type_id);
create index if not exists idx_cal_client_due on public.compliance_calendar(client_id, due_date);
create index if not exists idx_cal_due_status on public.compliance_calendar(due_date, status);
create index if not exists idx_cal_entity on public.compliance_calendar(entity_id);
create index if not exists idx_cal_type on public.compliance_calendar(compliance_type_id);

create index if not exists idx_tasks_client on public.tasks(client_id) where deleted_at is null;
create index if not exists idx_tasks_branch_status on public.tasks(branch_id, status) where deleted_at is null;
create index if not exists idx_tasks_due on public.tasks(due_date) where deleted_at is null;
create index if not exists idx_tasks_service on public.tasks(service_assignment_id);
create index if not exists idx_task_assign_task on public.task_assignments(task_id);
create index if not exists idx_task_assign_emp on public.task_assignments(employee_id, status);

create index if not exists idx_folders_client on public.document_folders(client_id);
create index if not exists idx_folders_parent on public.document_folders(parent_id);
create index if not exists idx_documents_client on public.documents(client_id, file_category) where deleted_at is null;
create index if not exists idx_documents_folder on public.documents(folder_id);
create index if not exists idx_documents_status on public.documents(status) where deleted_at is null;
create index if not exists idx_documents_tags on public.documents using gin(tags);
create index if not exists idx_documents_name_trgm on public.documents using gin(name gin_trgm_ops);
create index if not exists idx_docver_doc on public.document_versions(document_id, version_number desc);
create index if not exists idx_docreq_client on public.document_requests(client_id, status);
create index if not exists idx_docreq_task on public.document_requests(task_id);
create index if not exists idx_doclog_doc on public.document_actions_log(document_id, created_at desc);

create index if not exists idx_audits_client on public.audits(client_id) where deleted_at is null;
create index if not exists idx_audits_status on public.audits(status) where deleted_at is null;
create index if not exists idx_audits_service on public.audits(service_id);
create index if not exists idx_checklists_audit on public.audit_checklists(audit_id, status);
create index if not exists idx_observations_audit on public.audit_observations(audit_id, status);
create index if not exists idx_responses_obs on public.audit_responses(observation_id);

create index if not exists idx_tax_client_fy on public.tax_returns(client_id, financial_year);
create index if not exists idx_tax_entity on public.tax_returns(entity_id);
create index if not exists idx_tax_status on public.tax_returns(status);
create index if not exists idx_gst_client_period on public.gst_returns(client_id, period_year, period_month);
create index if not exists idx_gst_entity on public.gst_returns(entity_id);
create index if not exists idx_gst_status on public.gst_returns(status);

create index if not exists idx_payroll_runs_branch on public.payroll_runs(branch_id, period_year, period_month);
create index if not exists idx_payroll_profiles_client on public.employee_payroll_profiles(client_id) where deleted_at is null;
create index if not exists idx_payroll_records_run on public.employee_payroll_records(payroll_run_id);
create index if not exists idx_payroll_records_profile on public.employee_payroll_records(employee_profile_id);

create index if not exists idx_invoices_client on public.invoices(client_id, status) where deleted_at is null;
create index if not exists idx_invoices_branch on public.invoices(branch_id) where deleted_at is null;
create index if not exists idx_invoices_due on public.invoices(due_date) where status not in ('paid', 'void');
create index if not exists idx_invoices_service on public.invoices(client_service_id);
create index if not exists idx_invoice_items_invoice on public.invoice_items(invoice_id);
create index if not exists idx_payments_invoice on public.payments(invoice_id, status);
create index if not exists idx_payments_client on public.payments(client_id, payment_date desc);
create index if not exists idx_credit_notes_invoice on public.credit_notes(invoice_id);
create index if not exists idx_debit_notes_invoice on public.debit_notes(invoice_id);
create index if not exists idx_refunds_payment on public.refunds(payment_id);
create index if not exists idx_gl_branch_date on public.general_ledger(branch_id, entry_date desc);
create index if not exists idx_gl_reference on public.general_ledger(reference_type, reference_id);
create index if not exists idx_gl_account on public.general_ledger(account_code, entry_date);

create index if not exists idx_notifications_recipient on public.notifications(recipient_id, status, created_at desc);
create index if not exists idx_notifications_dispatch on public.notifications(status, send_after) where status = 'pending';
create index if not exists idx_queries_client on public.queries(client_id, status);
create index if not exists idx_queries_assigned on public.queries(assigned_to, status);
create index if not exists idx_queries_task on public.queries(task_id);
create index if not exists idx_query_responses_query on public.query_responses(query_id);
create index if not exists idx_chat_client on public.chat_messages(client_id, created_at desc);
create index if not exists idx_chat_unread on public.chat_messages(client_id) where is_read = false;

create index if not exists idx_blogs_status_pub on public.blogs(status, published_at desc);
create index if not exists idx_blogs_author on public.blogs(author_id);
create index if not exists idx_career_apps_career on public.career_applications(career_id, status);
create index if not exists idx_activity_user on public.activity_logs(user_id, created_at desc);
create index if not exists idx_activity_entity on public.activity_logs(entity_name, entity_id, created_at desc);

-- ============================================================
-- 2. SOFT-DELETE-AWARE UNIQUENESS
--    Replace plain unique constraints so a soft-deleted row
--    does not permanently reserve an identifier.
-- ============================================================
alter table public.users            drop constraint if exists users_email_key;
alter table public.clients          drop constraint if exists clients_client_code_key;
alter table public.employees        drop constraint if exists employees_employee_code_key;
alter table public.employees        drop constraint if exists employees_pan_key;
alter table public.client_entities  drop constraint if exists client_entities_pan_key;
alter table public.client_entities  drop constraint if exists client_entities_gst_number_key;
alter table public.client_entities  drop constraint if exists client_entities_cin_key;

create unique index if not exists uq_users_email        on public.users(email)                where deleted_at is null;
create unique index if not exists uq_clients_code       on public.clients(client_code)         where deleted_at is null;
create unique index if not exists uq_employees_code     on public.employees(employee_code)     where deleted_at is null;
create unique index if not exists uq_employees_pan      on public.employees(pan)               where deleted_at is null and pan is not null;
create unique index if not exists uq_entities_pan       on public.client_entities(pan)         where deleted_at is null and pan is not null;
create unique index if not exists uq_entities_gst       on public.client_entities(gst_number)  where deleted_at is null and gst_number is not null;
create unique index if not exists uq_entities_cin       on public.client_entities(cin)         where deleted_at is null and cin is not null;

-- ============================================================
-- 3. RACE-FREE DOCUMENT NUMBERING
--    count(*)+1 produces duplicate financial document numbers
--    under concurrency. Replaced with an atomic counter table.
-- ============================================================
create table if not exists public.document_number_counters (
    scope         varchar(100) primary key,
    current_value bigint not null default 0,
    updated_at    timestamptz not null default now()
);

create or replace function public.next_document_number(p_scope varchar)
returns bigint as $$
declare
  v bigint;
begin
  insert into public.document_number_counters as c (scope, current_value)
  values (p_scope, 1)
  on conflict (scope) do update
    set current_value = c.current_value + 1,
        updated_at    = now()
  returning current_value into v;
  return v;
end;
$$ language plpgsql;

-- Indian financial year label for a date: Apr-Mar => e.g. '2526'
create or replace function public.financial_year_code(p_date date default current_date)
returns varchar as $$
begin
  if extract(month from p_date) >= 4 then
    return to_char(p_date, 'YY') || to_char(p_date + interval '1 year', 'YY');
  else
    return to_char(p_date - interval '1 year', 'YY') || to_char(p_date, 'YY');
  end if;
end;
$$ language plpgsql immutable;

create or replace function public.generate_client_code_func()
returns trigger as $$
begin
  if new.client_code is null or new.client_code = '' then
    new.client_code := 'CL-' || to_char(public.next_document_number('client_code'), 'FM00000');
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function public.generate_employee_code_func()
returns trigger as $$
begin
  if new.employee_code is null or new.employee_code = '' then
    new.employee_code := 'EMP-' || to_char(public.next_document_number('employee_code'), 'FM00000');
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function public.generate_invoice_number_func()
returns trigger as $$
declare
  fy varchar;
begin
  if new.invoice_number is null or new.invoice_number = '' then
    fy := public.financial_year_code(coalesce(new.issue_date, current_date));
    new.invoice_number := 'INV-' || fy || '-'
      || to_char(public.next_document_number('invoice:' || fy), 'FM00000');
  end if;
  return new;
end;
$$ language plpgsql;

-- Numbering for payments / credit notes / debit notes / refunds (previously absent)
create or replace function public.generate_payment_number_func()
returns trigger as $$
declare fy varchar;
begin
  if new.payment_number is null or new.payment_number = '' then
    fy := public.financial_year_code(coalesce(new.payment_date, current_date));
    new.payment_number := 'PAY-' || fy || '-' || to_char(public.next_document_number('payment:' || fy), 'FM00000');
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function public.generate_credit_note_number_func()
returns trigger as $$
declare fy varchar;
begin
  if new.credit_note_number is null or new.credit_note_number = '' then
    fy := public.financial_year_code(current_date);
    new.credit_note_number := 'CN-' || fy || '-' || to_char(public.next_document_number('credit_note:' || fy), 'FM00000');
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function public.generate_debit_note_number_func()
returns trigger as $$
declare fy varchar;
begin
  if new.debit_note_number is null or new.debit_note_number = '' then
    fy := public.financial_year_code(current_date);
    new.debit_note_number := 'DN-' || fy || '-' || to_char(public.next_document_number('debit_note:' || fy), 'FM00000');
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function public.generate_refund_number_func()
returns trigger as $$
declare fy varchar;
begin
  if new.refund_number is null or new.refund_number = '' then
    fy := public.financial_year_code(coalesce(new.refund_date, current_date));
    new.refund_number := 'REF-' || fy || '-' || to_char(public.next_document_number('refund:' || fy), 'FM00000');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_payments_generate_number on public.payments;
create trigger trg_payments_generate_number before insert on public.payments
  for each row execute procedure public.generate_payment_number_func();

drop trigger if exists trg_credit_notes_generate_number on public.credit_notes;
create trigger trg_credit_notes_generate_number before insert on public.credit_notes
  for each row execute procedure public.generate_credit_note_number_func();

drop trigger if exists trg_debit_notes_generate_number on public.debit_notes;
create trigger trg_debit_notes_generate_number before insert on public.debit_notes
  for each row execute procedure public.generate_debit_note_number_func();

drop trigger if exists trg_refunds_generate_number on public.refunds;
create trigger trg_refunds_generate_number before insert on public.refunds
  for each row execute procedure public.generate_refund_number_func();

-- ============================================================
-- 4. FINANCIAL INTEGRITY
--    Old trigger fired on ANY update of a cleared payment and
--    re-added the amount (double counting) + posted a second,
--    single-entry ledger row. Rewritten to be idempotent and
--    to post a balanced double entry.
-- ============================================================
drop trigger if exists trg_payments_reconciliation on public.payments;

create or replace function public.reconcile_invoice_payment_func()
returns trigger as $$
declare
  inv          record;
  total_paid   numeric(15,2);
  total_credit numeric(15,2);
  net_due      numeric(15,2);
  new_status   varchar(30);
begin
  select * into inv from public.invoices where id = new.invoice_id for update;
  if not found then
    return new;
  end if;

  -- Recompute from source of truth rather than incrementing (idempotent).
  select coalesce(sum(amount), 0) into total_paid
  from public.payments
  where invoice_id = new.invoice_id and status = 'cleared';

  select coalesce(sum(amount), 0) into total_credit
  from public.credit_notes
  where invoice_id = new.invoice_id and status = 'active';

  net_due := inv.total_amount - total_credit - total_paid;
  if net_due < 0 then
    net_due := 0;
  end if;

  if inv.status = 'void' then
    new_status := 'void';
  elsif net_due = 0 then
    new_status := 'paid';
  elsif total_paid > 0 then
    new_status := 'partially_paid';
  elsif inv.due_date < current_date then
    new_status := 'overdue';
  else
    new_status := inv.status;
  end if;

  update public.invoices
     set paid_amount        = total_paid,
         outstanding_amount = net_due,
         status             = new_status
   where id = new.invoice_id;

  -- Balanced double entry, posted once per payment.
  if new.status = 'cleared'
     and not exists (
       select 1 from public.general_ledger
       where reference_type = 'payment' and reference_id = new.id
     )
  then
    insert into public.general_ledger
      (branch_id, account_code, account_name, transaction_type, amount, reference_type, reference_id, entry_date, description)
    values
      (inv.branch_id, '1100', 'Bank',                'debit',  new.amount, 'payment', new.id, new.payment_date,
       'Payment received for invoice ' || inv.invoice_number),
      (inv.branch_id, '1200', 'Accounts Receivable', 'credit', new.amount, 'payment', new.id, new.payment_date,
       'Settlement of invoice ' || inv.invoice_number);
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_payments_reconcile_insert
  after insert on public.payments
  for each row when (new.status = 'cleared')
  execute procedure public.reconcile_invoice_payment_func();

create trigger trg_payments_reconcile_status_change
  after update of status on public.payments
  for each row when (old.status is distinct from new.status)
  execute procedure public.reconcile_invoice_payment_func();

-- Ledger must always balance: enforce non-negative amounts.
alter table public.general_ledger drop constraint if exists chk_gl_amount_positive;
alter table public.general_ledger add constraint chk_gl_amount_positive check (amount >= 0);

alter table public.payments drop constraint if exists chk_payment_amount_positive;
alter table public.payments add constraint chk_payment_amount_positive check (amount > 0);

alter table public.invoices drop constraint if exists chk_invoice_amounts;
alter table public.invoices add constraint chk_invoice_amounts
  check (subtotal >= 0 and tax_amount >= 0 and discount_amount >= 0
         and total_amount >= 0 and paid_amount >= 0 and outstanding_amount >= 0);

-- ============================================================
-- 5. AUTH LOCKDOWN
--    Old handle_new_user trusted raw_user_meta_data->>'role',
--    letting a self-service signup request 'super_admin'.
--    Role elevation is now backend-only; signup is always client.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  client_role_id uuid;
begin
  select id into client_role_id from public.roles where code = 'client' limit 1;

  insert into public.users (id, email, first_name, last_name, role_id, status)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'first_name'), ''), ''),
    coalesce(nullif(trim(new.raw_user_meta_data->>'last_name'),  ''), ''),
    client_role_id,
    'active'
  )
  on conflict (id) do nothing;

  return new;
exception when others then
  -- Never let profile provisioning abort the auth signup transaction.
  raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Soft delete: schema-qualify, record the actor, keep audit trail intact.
create or replace function public.soft_delete_record()
returns trigger as $$
declare
  actor uuid;
begin
  begin
    actor := auth.uid();
  exception when others then
    actor := null;
  end;

  execute format(
    'update %I.%I set deleted_at = now(), deleted_by = coalesce($2, deleted_by) where id = $1 and deleted_at is null',
    tg_table_schema, tg_table_name
  ) using old.id, actor;

  insert into public.activity_logs (user_id, action, entity_name, entity_id, old_values)
  values (actor, 'SOFT_DELETE', tg_table_name, old.id, to_jsonb(old));

  return null;
end;
$$ language plpgsql security definer set search_path = public;

-- Harden remaining security-definer helpers against search_path hijacking.
alter function public.get_current_user_role()      set search_path = public;
alter function public.get_current_client_id()      set search_path = public;
alter function public.get_current_employee_id()    set search_path = public;
alter function public.get_current_user_branch_id() set search_path = public;
alter function public.log_activity_event()         set search_path = public;
alter function public.custom_access_token_hook(jsonb) set search_path = public;
