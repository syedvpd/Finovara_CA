-- 20260721000001_logic.sql
-- Seeding data, database functions, triggers, and RLS policies

-- 1. Seed Core Data (Roles and Branches)
insert into public.roles (name, code, description) values
  ('Super Admin', 'super_admin', 'Complete system access'),
  ('Managing Partner', 'managing_partner', 'Firm reports and approvals'),
  ('Chartered Accountant', 'chartered_accountant', 'Assigned client and professional work'),
  ('Audit Manager', 'audit_manager', 'Audit teams and assignments'),
  ('Tax Manager', 'tax_manager', 'Tax services and filings'),
  ('GST Consultant', 'gst_consultant', 'GST clients and returns'),
  ('Accountant', 'accountant', 'Books, reconciliations and reports'),
  ('Payroll Executive', 'payroll_executive', 'Payroll module'),
  ('Relationship Manager', 'relationship_manager', 'Client communication'),
  ('Accounts Admin', 'accounts_admin', 'Invoices and payments'),
  ('Content Manager', 'content_manager', 'Website content'),
  ('Client', 'client', 'Own services, files and reports')
on conflict (code) do update set name = excluded.name, description = excluded.description;

insert into public.branches (name, code, address, email, phone) values
  ('Hyderabad', 'HYD', 'Hyderabad, Telangana, India', 'hyd@finovara.com', '+914012345678'),
  ('Bengaluru', 'BLR', 'Bengaluru, Karnataka, India', 'blr@finovara.com', '+918012345678'),
  ('Vijayawada', 'VJA', 'Vijayawada, Andhra Pradesh, India', 'vja@finovara.com', '+918661234567'),
  ('Visakhapatnam', 'VTZ', 'Visakhapatnam, Andhra Pradesh, India', 'vtz@finovara.com', '+918911234567'),
  ('Chennai', 'MAA', 'Chennai, Tamil Nadu, India', 'maa@finovara.com', '+914412345678'),
  ('Pune', 'PNQ', 'Pune, Maharashtra, India', 'pnq@finovara.com', '+912012345678')
on conflict (code) do update set name = excluded.name, address = excluded.address;

-- 2. RLS & Auth Helper Functions
create or replace function public.get_current_user_role()
returns varchar as $$
begin
  return coalesce(
    (select r.code
     from public.users u
     join public.roles r on u.role_id = r.id
     where u.id = auth.uid()),
    'public'
  );
end;
$$ language plpgsql stable security definer;

create or replace function public.get_current_client_id()
returns uuid as $$
begin
  return (select id from public.clients where user_id = auth.uid() limit 1);
end;
$$ language plpgsql stable security definer;

create or replace function public.get_current_employee_id()
returns uuid as $$
begin
  return (select id from public.employees where user_id = auth.uid() limit 1);
end;
$$ language plpgsql stable security definer;

create or replace function public.get_current_user_branch_id()
returns uuid as $$
declare
  b_id uuid;
begin
  -- Try employee first
  select branch_id into b_id from public.employees where user_id = auth.uid() limit 1;
  if b_id is not null then
    return b_id;
  end if;
  -- Try client
  select branch_id into b_id from public.clients where user_id = auth.uid() limit 1;
  return b_id;
end;
$$ language plpgsql stable security definer;

-- 3. Core Triggers & Functions
-- A. updated_at timestamp helper
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- B. Soft delete record interceptor
create or replace function public.soft_delete_record()
returns trigger as $$
begin
  execute format('update %I set deleted_at = now() where id = $1', tg_table_name) using old.id;
  return null;
end;
$$ language plpgsql;

-- C. Generic activity logger
create or replace function public.log_activity_event()
returns trigger as $$
declare
  current_user_id uuid;
  old_data jsonb := null;
  new_data jsonb := null;
begin
  begin
    current_user_id := auth.uid();
  exception when others then
    current_user_id := null;
  end;

  if tg_op = 'UPDATE' then
    old_data := to_jsonb(old);
    new_data := to_jsonb(new);
  elsif tg_op = 'INSERT' then
    new_data := to_jsonb(new);
  elsif tg_op = 'DELETE' then
    old_data := to_jsonb(old);
  end if;

  insert into public.activity_logs (user_id, action, entity_name, entity_id, old_values, new_values)
  values (current_user_id, tg_op, tg_table_name, coalesce(new.id, old.id), old_data, new_data);

  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$ language plpgsql security definer;

-- D. Serial code generators
create or replace function public.generate_client_code_func()
returns trigger as $$
declare
  next_seq integer;
begin
  select coalesce(count(*), 0) + 1 into next_seq from public.clients;
  new.client_code := 'CL-' || to_char(next_seq, 'FM00000');
  return new;
end;
$$ language plpgsql;

create or replace function public.generate_employee_code_func()
returns trigger as $$
declare
  next_seq integer;
begin
  select coalesce(count(*), 0) + 1 into next_seq from public.employees;
  new.employee_code := 'EMP-' || to_char(next_seq, 'FM00000');
  return new;
end;
$$ language plpgsql;

create or replace function public.generate_invoice_number_func()
returns trigger as $$
declare
  next_seq integer;
  fy_part varchar(4);
begin
  fy_part := to_char(now(), 'YY') || to_char(now() + interval '1 year', 'YY');
  select coalesce(count(*), 0) + 1 into next_seq 
  from public.invoices 
  where to_char(created_at, 'YYYY') = to_char(now(), 'YYYY');
  new.invoice_number := 'INV-' || fy_part || '-' || to_char(next_seq, 'FM00000');
  return new;
end;
$$ language plpgsql;

-- E. Document versioning
create or replace function public.handle_document_versioning()
returns trigger as $$
declare
  next_ver integer;
begin
  if (tg_op = 'UPDATE') and (old.file_path <> new.file_path) then
    select coalesce(max(version_number), 0) + 1 into next_ver
    from public.document_versions
    where document_id = new.id;

    insert into public.document_versions (document_id, version_number, file_path, file_size, change_summary, created_by)
    values (new.id, next_ver, old.file_path, old.file_size, 'File updated', old.created_by);
    
    new.version_count := next_ver;
  end if;
  return new;
end;
$$ language plpgsql;

-- F. Invoice payment reconciler
create or replace function public.reconcile_invoice_payment_func()
returns trigger as $$
declare
  inv_record record;
  new_outstanding numeric(15,2);
  new_status varchar(30);
begin
  if new.status = 'cleared' then
    select * into inv_record from public.invoices where id = new.invoice_id;
    if found then
      new_outstanding := inv_record.outstanding_amount - new.amount;
      if new_outstanding <= 0 then
        new_status := 'paid';
        new_outstanding := 0;
      else
        new_status := 'partially_paid';
      end if;
      
      update public.invoices 
      set outstanding_amount = new_outstanding,
          paid_amount = paid_amount + new.amount,
          status = new_status
      where id = new.invoice_id;

      -- Post to general ledger
      insert into public.general_ledger (branch_id, account_code, account_name, transaction_type, amount, reference_type, reference_id, entry_date, description)
      values (
        inv_record.branch_id,
        '1200', -- Accounts Receivable
        'Accounts Receivable',
        'credit',
        new.amount,
        'payment',
        new.id,
        new.payment_date,
        'Payment received for invoice ' || inv_record.invoice_number
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- G. Supabase Auth sync user profile trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, first_name, last_name, role_id, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    (select id from public.roles where code = coalesce(new.raw_user_meta_data->>'role', 'client') limit 1),
    'active'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 4. Apply Triggers to Tables
-- updated_at triggers
create trigger trg_roles_updated_at before update on public.roles for each row execute procedure public.update_updated_at_column();
create trigger trg_permissions_updated_at before update on public.permissions for each row execute procedure public.update_updated_at_column();
create trigger trg_users_updated_at before update on public.users for each row execute procedure public.update_updated_at_column();
create trigger trg_branches_updated_at before update on public.branches for each row execute procedure public.update_updated_at_column();
create trigger trg_employees_updated_at before update on public.employees for each row execute procedure public.update_updated_at_column();
create trigger trg_leads_updated_at before update on public.leads for each row execute procedure public.update_updated_at_column();
create trigger trg_consultations_updated_at before update on public.consultations for each row execute procedure public.update_updated_at_column();
create trigger trg_proposals_updated_at before update on public.proposals for each row execute procedure public.update_updated_at_column();
create trigger trg_clients_updated_at before update on public.clients for each row execute procedure public.update_updated_at_column();
create trigger trg_client_entities_updated_at before update on public.client_entities for each row execute procedure public.update_updated_at_column();
create trigger trg_client_documents_kyc_updated_at before update on public.client_documents_kyc for each row execute procedure public.update_updated_at_column();
create trigger trg_services_updated_at before update on public.services for each row execute procedure public.update_updated_at_column();
create trigger trg_client_services_updated_at before update on public.client_services for each row execute procedure public.update_updated_at_column();
create trigger trg_compliance_types_updated_at before update on public.compliance_types for each row execute procedure public.update_updated_at_column();
create trigger trg_compliance_rules_updated_at before update on public.compliance_rules for each row execute procedure public.update_updated_at_column();
create trigger trg_compliance_calendar_updated_at before update on public.compliance_calendar for each row execute procedure public.update_updated_at_column();
create trigger trg_tasks_updated_at before update on public.tasks for each row execute procedure public.update_updated_at_column();
create trigger trg_document_folders_updated_at before update on public.document_folders for each row execute procedure public.update_updated_at_column();
create trigger trg_documents_updated_at before update on public.documents for each row execute procedure public.update_updated_at_column();
create trigger trg_document_requests_updated_at before update on public.document_requests for each row execute procedure public.update_updated_at_column();
create trigger trg_audits_updated_at before update on public.audits for each row execute procedure public.update_updated_at_column();
create trigger trg_audit_checklists_updated_at before update on public.audit_checklists for each row execute procedure public.update_updated_at_column();
create trigger trg_audit_observations_updated_at before update on public.audit_observations for each row execute procedure public.update_updated_at_column();
create trigger trg_tax_returns_updated_at before update on public.tax_returns for each row execute procedure public.update_updated_at_column();
create trigger trg_gst_returns_updated_at before update on public.gst_returns for each row execute procedure public.update_updated_at_column();
create trigger trg_payroll_runs_updated_at before update on public.payroll_runs for each row execute procedure public.update_updated_at_column();
create trigger trg_employee_payroll_profiles_updated_at before update on public.employee_payroll_profiles for each row execute procedure public.update_updated_at_column();
create trigger trg_employee_payroll_records_updated_at before update on public.employee_payroll_records for each row execute procedure public.update_updated_at_column();
create trigger trg_invoices_updated_at before update on public.invoices for each row execute procedure public.update_updated_at_column();
create trigger trg_notification_templates_updated_at before update on public.notification_templates for each row execute procedure public.update_updated_at_column();
create trigger trg_queries_updated_at before update on public.queries for each row execute procedure public.update_updated_at_column();
create trigger trg_blogs_updated_at before update on public.blogs for each row execute procedure public.update_updated_at_column();
create trigger trg_downloads_updated_at before update on public.downloads for each row execute procedure public.update_updated_at_column();
create trigger trg_careers_updated_at before update on public.careers for each row execute procedure public.update_updated_at_column();
create trigger trg_website_settings_updated_at before update on public.website_settings for each row execute procedure public.update_updated_at_column();

-- Soft delete triggers
create trigger trg_users_soft_delete before delete on public.users for each row execute procedure public.soft_delete_record();
create trigger trg_employees_soft_delete before delete on public.employees for each row execute procedure public.soft_delete_record();
create trigger trg_clients_soft_delete before delete on public.clients for each row execute procedure public.soft_delete_record();
create trigger trg_client_entities_soft_delete before delete on public.client_entities for each row execute procedure public.soft_delete_record();
create trigger trg_services_soft_delete before delete on public.services for each row execute procedure public.soft_delete_record();
create trigger trg_tasks_soft_delete before delete on public.tasks for each row execute procedure public.soft_delete_record();
create trigger trg_documents_soft_delete before delete on public.documents for each row execute procedure public.soft_delete_record();
create trigger trg_audits_soft_delete before delete on public.audits for each row execute procedure public.soft_delete_record();
create trigger trg_employee_payroll_profiles_soft_delete before delete on public.employee_payroll_profiles for each row execute procedure public.soft_delete_record();
create trigger trg_invoices_soft_delete before delete on public.invoices for each row execute procedure public.soft_delete_record();

-- Activity logging triggers
create trigger trg_clients_audit after insert or update or delete on public.clients for each row execute procedure public.log_activity_event();
create trigger trg_invoices_audit after insert or update or delete on public.invoices for each row execute procedure public.log_activity_event();
create trigger trg_payments_audit after insert or update or delete on public.payments for each row execute procedure public.log_activity_event();
create trigger trg_documents_audit after insert or update or delete on public.documents for each row execute procedure public.log_activity_event();

-- Serial keys
create trigger trg_clients_generate_code before insert on public.clients for each row execute procedure public.generate_client_code_func();
create trigger trg_employees_generate_code before insert on public.employees for each row execute procedure public.generate_employee_code_func();
create trigger trg_invoices_generate_number before insert on public.invoices for each row execute procedure public.generate_invoice_number_func();

-- Document versioning
create trigger trg_documents_versioning before update on public.documents for each row execute procedure public.handle_document_versioning();

-- Payment reconciliation
create trigger trg_payments_reconciliation after insert or update on public.payments for each row execute procedure public.reconcile_invoice_payment_func();

-- Supabase auth sync trigger (handles triggers on auth schema user creations)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Storage Buckets Provisioning
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('client-documents', 'client-documents', false, 20971520, '{"application/pdf", "image/png", "image/jpeg", "application/zip", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}'),
  ('audit-documents', 'audit-documents', false, 52428800, '{"application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}'),
  ('tax-documents', 'tax-documents', false, 20971520, '{"application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}'),
  ('gst-documents', 'gst-documents', false, 20971520, '{"application/pdf", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}'),
  ('payroll', 'payroll', false, 10485760, '{"application/pdf", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}'),
  ('generated-reports', 'generated-reports', false, 31457280, '{"application/pdf"}'),
  ('generated-pdfs', 'generated-pdfs', false, 10485760, '{"application/pdf"}'),
  ('website-assets', 'website-assets', true, 5242880, '{"image/png", "image/jpeg", "image/svg+xml", "image/webp"}'),
  ('avatars', 'avatars', true, 2097152, '{"image/png", "image/jpeg", "image/webp"}'),
  ('temporary-files', 'temporary-files', false, 20971520, '{"application/pdf", "image/png", "image/jpeg", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}'),
  ('backups', 'backups', false, 524288000, '{"application/sql", "application/gzip", "application/zip"}')
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 6. Row Level Security Policies
-- Enable RLS on all schemas
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.users enable row level security;
alter table public.login_history enable row level security;
alter table public.user_sessions enable row level security;
alter table public.branches enable row level security;
alter table public.employees enable row level security;
alter table public.employee_branch_access enable row level security;
alter table public.leads enable row level security;
alter table public.consultations enable row level security;
alter table public.proposals enable row level security;
alter table public.clients enable row level security;
alter table public.client_entities enable row level security;
alter table public.client_documents_kyc enable row level security;
alter table public.services enable row level security;
alter table public.client_services enable row level security;
alter table public.compliance_types enable row level security;
alter table public.compliance_rules enable row level security;
alter table public.compliance_calendar enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignments enable row level security;
alter table public.document_folders enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_requests enable row level security;
alter table public.document_actions_log enable row level security;
alter table public.audits enable row level security;
alter table public.audit_checklists enable row level security;
alter table public.audit_observations enable row level security;
alter table public.audit_responses enable row level security;
alter table public.tax_returns enable row level security;
alter table public.gst_returns enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.employee_payroll_profiles enable row level security;
alter table public.employee_payroll_records enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.credit_notes enable row level security;
alter table public.debit_notes enable row level security;
alter table public.refunds enable row level security;
alter table public.general_ledger enable row level security;
alter table public.notification_templates enable row level security;
alter table public.notifications enable row level security;
alter table public.queries enable row level security;
alter table public.query_responses enable row level security;
alter table public.chat_messages enable row level security;
alter table public.blogs enable row level security;
alter table public.downloads enable row level security;
alter table public.careers enable row level security;
alter table public.career_applications enable row level security;
alter table public.website_settings enable row level security;
alter table public.activity_logs enable row level security;

-- Defining Specific RLS Policies
-- Roles & Permissions policies
create policy "Allow read access to authenticated users" on public.roles for select to authenticated using (true);
create policy "Allow read access to authenticated users" on public.permissions for select to authenticated using (true);

-- User table policies
create policy "Allow users to read their own record" on public.users for select to authenticated 
  using (auth.uid() = id or public.get_current_user_role() in ('super_admin', 'managing_partner'));
create policy "Allow users to update their own record" on public.users for update to authenticated 
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "Allow admin to manage all users" on public.users for all to authenticated 
  using (public.get_current_user_role() = 'super_admin');

-- Employee table policies
create policy "Allow staff to read employee records" on public.employees for select to authenticated 
  using (public.get_current_user_role() not in ('client') and (branch_id = public.get_current_user_branch_id() or public.get_current_user_role() in ('super_admin', 'managing_partner')));
create policy "Allow admin/partner to write employees" on public.employees for all to authenticated 
  using (public.get_current_user_role() in ('super_admin', 'managing_partner'));

-- Client table policies
create policy "Allow clients to view their own profile" on public.clients for select to authenticated 
  using (user_id = auth.uid());
create policy "Allow staff to view branch clients" on public.clients for select to authenticated 
  using (public.get_current_user_role() not in ('client') and (branch_id = public.get_current_user_branch_id() or public.get_current_user_role() in ('super_admin', 'managing_partner')));
create policy "Allow admin/partner to write clients" on public.clients for all to authenticated 
  using (public.get_current_user_role() in ('super_admin', 'managing_partner'));

-- Client entity policies
create policy "Allow clients to view their own entities" on public.client_entities for select to authenticated 
  using (client_id = public.get_current_client_id());
create policy "Allow staff to view branch client entities" on public.client_entities for select to authenticated 
  using (public.get_current_user_role() not in ('client') and ((select branch_id from public.clients where id = client_id) = public.get_current_user_branch_id() or public.get_current_user_role() in ('super_admin', 'managing_partner')));
create policy "Allow staff to manage client entities" on public.client_entities for all to authenticated 
  using (public.get_current_user_role() in ('super_admin', 'managing_partner', 'chartered_accountant'));

-- Documents policies
create policy "Allow clients to manage their own documents" on public.documents for all to authenticated 
  using (client_id = public.get_current_client_id());
create policy "Allow staff to view branch documents" on public.documents for select to authenticated 
  using (public.get_current_user_role() not in ('client') and ((select branch_id from public.clients where id = client_id) = public.get_current_user_branch_id() or public.get_current_user_role() in ('super_admin', 'managing_partner')));
create policy "Allow staff to upload/update documents" on public.documents for all to authenticated 
  using (public.get_current_user_role() not in ('client', 'public'));
