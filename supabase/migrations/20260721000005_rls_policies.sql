-- 20260721000005_rls_policies.sql
-- RLS was enabled on 51 tables but policies existed for only 6.
-- Postgres default-denies when RLS is on and no policy matches, so the
-- remaining tables were unreachable. This completes the policy set.

-- ============================================================
-- 1. Authorization helper predicates
-- ============================================================
create or replace function public.is_admin()
returns boolean as $$
  select public.get_current_user_role() in ('super_admin', 'managing_partner');
$$ language sql stable security definer set search_path = public;

create or replace function public.is_staff()
returns boolean as $$
  select public.get_current_user_role() not in ('client', 'public');
$$ language sql stable security definer set search_path = public;

-- Staff see their branch (plus any explicitly granted branch); admins see all;
-- clients see only their own records.
create or replace function public.can_access_client(p_client_id uuid)
returns boolean as $$
declare
  c_branch uuid;
  emp_id   uuid;
begin
  if p_client_id is null then
    return public.is_admin();
  end if;

  if p_client_id = public.get_current_client_id() then
    return true;
  end if;

  if public.is_admin() then
    return true;
  end if;

  if not public.is_staff() then
    return false;
  end if;

  select branch_id into c_branch from public.clients where id = p_client_id;
  if c_branch is null then
    return false;
  end if;

  if c_branch = public.get_current_user_branch_id() then
    return true;
  end if;

  emp_id := public.get_current_employee_id();
  return exists (
    select 1 from public.employee_branch_access
    where employee_id = emp_id and branch_id = c_branch
  );
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function public.can_access_branch(p_branch_id uuid)
returns boolean as $$
begin
  if public.is_admin() then
    return true;
  end if;
  if p_branch_id is null or not public.is_staff() then
    return false;
  end if;
  if p_branch_id = public.get_current_user_branch_id() then
    return true;
  end if;
  return exists (
    select 1 from public.employee_branch_access
    where employee_id = public.get_current_employee_id() and branch_id = p_branch_id
  );
end;
$$ language plpgsql stable security definer set search_path = public;

-- ============================================================
-- 2. Reference / catalog tables — readable by authenticated, writable by admin
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'role_permissions','branches','services','compliance_types','compliance_rules','notification_templates'
  ] loop
    execute format('drop policy if exists "read_authenticated" on public.%I', t);
    execute format('create policy "read_authenticated" on public.%I for select to authenticated using (true)', t);
    execute format('drop policy if exists "write_admin" on public.%I', t);
    execute format('create policy "write_admin" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end;
$$;

-- Roles/permissions writes are admin-only (read policy already exists).
drop policy if exists "write_admin" on public.roles;
create policy "write_admin" on public.roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "write_admin" on public.permissions;
create policy "write_admin" on public.permissions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 3. Public website content — anonymous read of published rows only
-- ============================================================
drop policy if exists "public_read_published" on public.blogs;
create policy "public_read_published" on public.blogs for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());
drop policy if exists "staff_manage" on public.blogs;
create policy "staff_manage" on public.blogs for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "public_read" on public.downloads;
create policy "public_read" on public.downloads for select to anon, authenticated
  using (is_public = true or public.is_staff());
drop policy if exists "staff_manage" on public.downloads;
create policy "staff_manage" on public.downloads for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "public_read_open" on public.careers;
create policy "public_read_open" on public.careers for select to anon, authenticated
  using (status = 'open' or public.is_staff());
drop policy if exists "staff_manage" on public.careers;
create policy "staff_manage" on public.careers for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Anyone may apply; only staff may read applications.
drop policy if exists "public_apply" on public.career_applications;
create policy "public_apply" on public.career_applications for insert to anon, authenticated
  with check (true);
drop policy if exists "staff_read" on public.career_applications;
create policy "staff_read" on public.career_applications for select to authenticated
  using (public.is_staff());
drop policy if exists "staff_manage" on public.career_applications;
create policy "staff_manage" on public.career_applications for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "public_read" on public.website_settings;
create policy "public_read" on public.website_settings for select to anon, authenticated using (true);
drop policy if exists "admin_manage" on public.website_settings;
create policy "admin_manage" on public.website_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Public lead capture (contact / consultation forms).
drop policy if exists "public_submit_lead" on public.leads;
create policy "public_submit_lead" on public.leads for insert to anon, authenticated with check (true);
drop policy if exists "staff_manage" on public.leads;
create policy "staff_manage" on public.leads for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- 4. Staff-only operational tables
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['consultations','proposals','payroll_runs','general_ledger'] loop
    execute format('drop policy if exists "staff_all" on public.%I', t);
    execute format('create policy "staff_all" on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end;
$$;

drop policy if exists "staff_read" on public.employee_branch_access;
create policy "staff_read" on public.employee_branch_access for select to authenticated using (public.is_staff());
drop policy if exists "admin_manage" on public.employee_branch_access;
create policy "admin_manage" on public.employee_branch_access for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 5. Client-scoped tables — client sees own, staff sees accessible branches
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'client_documents_kyc','client_services','compliance_calendar','tasks',
    'document_folders','document_requests','audits','tax_returns','gst_returns',
    'employee_payroll_profiles','invoices','queries','chat_messages'
  ] loop
    execute format('drop policy if exists "client_scope_read" on public.%I', t);
    execute format(
      'create policy "client_scope_read" on public.%I for select to authenticated using (public.can_access_client(client_id))', t);
    execute format('drop policy if exists "staff_scope_write" on public.%I', t);
    execute format(
      'create policy "staff_scope_write" on public.%I for all to authenticated using (public.is_staff() and public.can_access_client(client_id)) with check (public.is_staff() and public.can_access_client(client_id))', t);
  end loop;
end;
$$;

-- Clients may raise their own queries, reply in chat, and upload documents.
drop policy if exists "client_raise_query" on public.queries;
create policy "client_raise_query" on public.queries for insert to authenticated
  with check (client_id = public.get_current_client_id() and raised_by = auth.uid());

drop policy if exists "client_send_chat" on public.chat_messages;
create policy "client_send_chat" on public.chat_messages for insert to authenticated
  with check (client_id = public.get_current_client_id() and sender_type = 'client');

drop policy if exists "client_upload_kyc" on public.client_documents_kyc;
create policy "client_upload_kyc" on public.client_documents_kyc for insert to authenticated
  with check (client_id = public.get_current_client_id());

-- Payments: clients read their own, only finance staff write.
drop policy if exists "client_scope_read" on public.payments;
create policy "client_scope_read" on public.payments for select to authenticated
  using (public.can_access_client(client_id));
drop policy if exists "finance_write" on public.payments;
create policy "finance_write" on public.payments for all to authenticated
  using (public.get_current_user_role() in ('super_admin','managing_partner','accounts_admin','accountant'))
  with check (public.get_current_user_role() in ('super_admin','managing_partner','accounts_admin','accountant'));

-- ============================================================
-- 6. Tables scoped through a parent row
-- ============================================================
drop policy if exists "scope_via_task" on public.task_assignments;
create policy "scope_via_task" on public.task_assignments for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.can_access_client(t.client_id)))
  with check (public.is_staff());

drop policy if exists "scope_via_document" on public.document_versions;
create policy "scope_via_document" on public.document_versions for select to authenticated
  using (exists (select 1 from public.documents d where d.id = document_id and public.can_access_client(d.client_id)));
drop policy if exists "staff_write" on public.document_versions;
create policy "staff_write" on public.document_versions for insert to authenticated
  with check (public.is_staff());

drop policy if exists "scope_via_document" on public.document_actions_log;
create policy "scope_via_document" on public.document_actions_log for select to authenticated
  using (exists (select 1 from public.documents d where d.id = document_id and public.can_access_client(d.client_id)));
drop policy if exists "append_only" on public.document_actions_log;
create policy "append_only" on public.document_actions_log for insert to authenticated with check (true);

drop policy if exists "scope_via_audit" on public.audit_checklists;
create policy "scope_via_audit" on public.audit_checklists for all to authenticated
  using (exists (select 1 from public.audits a where a.id = audit_id and public.can_access_client(a.client_id)))
  with check (public.is_staff());

drop policy if exists "scope_via_audit" on public.audit_observations;
create policy "scope_via_audit" on public.audit_observations for select to authenticated
  using (exists (select 1 from public.audits a where a.id = audit_id and public.can_access_client(a.client_id)));
drop policy if exists "staff_write" on public.audit_observations;
create policy "staff_write" on public.audit_observations for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Management responses: the client under audit may respond to an observation.
drop policy if exists "scope_via_observation" on public.audit_responses;
create policy "scope_via_observation" on public.audit_responses for select to authenticated
  using (exists (
    select 1 from public.audit_observations o
    join public.audits a on a.id = o.audit_id
    where o.id = observation_id and public.can_access_client(a.client_id)));
drop policy if exists "respond" on public.audit_responses;
create policy "respond" on public.audit_responses for insert to authenticated
  with check (responder_id = auth.uid() and exists (
    select 1 from public.audit_observations o
    join public.audits a on a.id = o.audit_id
    where o.id = observation_id and public.can_access_client(a.client_id)));

drop policy if exists "scope_via_invoice" on public.invoice_items;
create policy "scope_via_invoice" on public.invoice_items for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and public.can_access_client(i.client_id)));
drop policy if exists "finance_write" on public.invoice_items;
create policy "finance_write" on public.invoice_items for all to authenticated
  using (public.get_current_user_role() in ('super_admin','managing_partner','accounts_admin'))
  with check (public.get_current_user_role() in ('super_admin','managing_partner','accounts_admin'));

do $$
declare t text;
begin
  foreach t in array array['credit_notes','debit_notes'] loop
    execute format('drop policy if exists "scope_via_invoice" on public.%I', t);
    execute format('create policy "scope_via_invoice" on public.%I for select to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_id and public.can_access_client(i.client_id)))', t);
    execute format('drop policy if exists "finance_write" on public.%I', t);
    execute format('create policy "finance_write" on public.%I for all to authenticated using (public.get_current_user_role() in (''super_admin'',''managing_partner'',''accounts_admin'')) with check (public.get_current_user_role() in (''super_admin'',''managing_partner'',''accounts_admin''))', t);
  end loop;
end;
$$;

drop policy if exists "scope_via_payment" on public.refunds;
create policy "scope_via_payment" on public.refunds for select to authenticated
  using (exists (select 1 from public.payments p where p.id = payment_id and public.can_access_client(p.client_id)));
drop policy if exists "admin_write" on public.refunds;
create policy "admin_write" on public.refunds for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "scope_via_run" on public.employee_payroll_records;
create policy "scope_via_run" on public.employee_payroll_records for all to authenticated
  using (public.get_current_user_role() in ('super_admin','managing_partner','payroll_executive','accountant'))
  with check (public.get_current_user_role() in ('super_admin','managing_partner','payroll_executive','accountant'));

drop policy if exists "scope_via_query" on public.query_responses;
create policy "scope_via_query" on public.query_responses for select to authenticated
  using (exists (select 1 from public.queries q where q.id = query_id and public.can_access_client(q.client_id)));
drop policy if exists "participant_write" on public.query_responses;
create policy "participant_write" on public.query_responses for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.queries q where q.id = query_id and public.can_access_client(q.client_id)));

-- ============================================================
-- 7. Documents — the existing client policy granted FOR ALL on
--    client_id match, letting a client forge rows for others.
--    Rewritten with explicit WITH CHECK.
-- ============================================================
drop policy if exists "Allow clients to manage their own documents" on public.documents;
drop policy if exists "Allow staff to view branch documents" on public.documents;
drop policy if exists "Allow staff to upload/update documents" on public.documents;

create policy "read_scope" on public.documents for select to authenticated
  using (public.can_access_client(client_id));
create policy "client_upload" on public.documents for insert to authenticated
  with check (client_id = public.get_current_client_id() or (public.is_staff() and public.can_access_client(client_id)));
create policy "staff_update" on public.documents for update to authenticated
  using (public.is_staff() and public.can_access_client(client_id))
  with check (public.is_staff() and public.can_access_client(client_id));
create policy "staff_delete" on public.documents for delete to authenticated
  using (public.is_staff() and public.can_access_client(client_id));

-- ============================================================
-- 8. Notifications, sessions, logs — strictly own-row
-- ============================================================
drop policy if exists "own_notifications" on public.notifications;
create policy "own_notifications" on public.notifications for select to authenticated
  using (recipient_id = auth.uid() or public.is_admin());
drop policy if exists "own_notifications_update" on public.notifications;
create policy "own_notifications_update" on public.notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
drop policy if exists "staff_dispatch" on public.notifications;
create policy "staff_dispatch" on public.notifications for insert to authenticated
  with check (public.is_staff());

drop policy if exists "own_sessions" on public.user_sessions;
create policy "own_sessions" on public.user_sessions for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists "own_login_history" on public.login_history;
create policy "own_login_history" on public.login_history for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Activity logs are an audit trail: readable by admins, never mutable from the client.
drop policy if exists "admin_read" on public.activity_logs;
create policy "admin_read" on public.activity_logs for select to authenticated using (public.is_admin());

-- ============================================================
-- 9. Storage bucket policies (all private buckets deny by default)
-- ============================================================
-- Path convention enforced by the backend: <client_id>/<category>/<filename>
create or replace function public.storage_path_client_id(p_name text)
returns uuid as $$
begin
  return (split_part(p_name, '/', 1))::uuid;
exception when others then
  return null;
end;
$$ language plpgsql immutable;

drop policy if exists "private_bucket_read" on storage.objects;
create policy "private_bucket_read" on storage.objects for select to authenticated
  using (
    bucket_id in ('client-documents','audit-documents','tax-documents','gst-documents','payroll','generated-reports','generated-pdfs')
    and public.can_access_client(public.storage_path_client_id(name))
  );

drop policy if exists "private_bucket_write" on storage.objects;
create policy "private_bucket_write" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('client-documents','audit-documents','tax-documents','gst-documents')
    and public.can_access_client(public.storage_path_client_id(name))
  );

drop policy if exists "private_bucket_update" on storage.objects;
create policy "private_bucket_update" on storage.objects for update to authenticated
  using (public.is_staff() and public.can_access_client(public.storage_path_client_id(name)));

drop policy if exists "private_bucket_delete" on storage.objects;
create policy "private_bucket_delete" on storage.objects for delete to authenticated
  using (public.is_admin());

drop policy if exists "public_bucket_read" on storage.objects;
create policy "public_bucket_read" on storage.objects for select to anon, authenticated
  using (bucket_id in ('website-assets','avatars'));

drop policy if exists "own_avatar_write" on storage.objects;
create policy "own_avatar_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "cms_asset_write" on storage.objects;
create policy "cms_asset_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'website-assets' and public.is_staff());
