-- database_test.sql
-- Database verification test script for Finovara ERP.
-- Runs a series of unit tests inside a transaction and rolls back.

begin;

-- 1. Helper function for assertion
create or replace procedure assert_true(val boolean, msg text) as $$
begin
  if not val then
    raise exception 'Assertion failed: %', msg;
  end if;
end;
$$ language plpgsql;

-- 2. Mocking auth.users entry
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001'::uuid, 'test_user@finovara.com')
on conflict do nothing;

-- 3. Run validation inside a DO block
do $$
declare
  inv_id uuid;
begin
  -- Verify handle_new_user trigger has populated public.users
  raise notice 'Testing Auth Sync User Trigger...';
  if not exists(select 1 from public.users where email = 'test_user@finovara.com') then
    raise exception 'Auth sync user trigger did not create public.users record';
  end if;

  -- Test Employee code generator
  raise notice 'Testing Employee Code Generator...';
  insert into public.employees (user_id, designation, department, branch_id, date_of_joining)
  values (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Chartered Accountant',
    'Audit',
    (select id from public.branches limit 1),
    current_date
  );

  if not exists(select 1 from public.employees where employee_code like 'EMP-%') then
    raise exception 'Employee code was not auto-generated';
  end if;

  -- Test Client code generator
  raise notice 'Testing Client Code Generator...';
  -- Create user for client
  insert into auth.users (id, email)
  values ('00000000-0000-0000-0000-000000000002'::uuid, 'client_user@finovara.com')
  on conflict do nothing;

  insert into public.clients (user_id, branch_id, client_type, status)
  values (
    '00000000-0000-0000-0000-000000000002'::uuid,
    (select id from public.branches limit 1),
    'individual',
    'active'
  );

  if not exists(select 1 from public.clients where client_code like 'CL-%') then
    raise exception 'Client code was not auto-generated';
  end if;

  -- Test Soft Delete
  raise notice 'Testing Soft Delete...';
  delete from public.clients where user_id = '00000000-0000-0000-0000-000000000002'::uuid;

  if not exists(select 1 from public.clients where user_id = '00000000-0000-0000-0000-000000000002'::uuid and deleted_at is not null) then
    raise exception 'Client record was not soft-deleted';
  end if;

  -- Test Invoice Generation & Payment Reconciliation
  raise notice 'Testing Invoice & Payment Reconciliation...';
  insert into public.invoices (client_id, branch_id, due_date, subtotal, tax_amount, total_amount, outstanding_amount)
  values (
    (select id from public.clients where user_id = '00000000-0000-0000-0000-000000000002'::uuid),
    (select id from public.branches limit 1),
    current_date + 30,
    1000.00,
    180.00,
    1180.00,
    1180.00
  );

  select id into inv_id from public.invoices limit 1;

  -- Verify Invoice serial number
  if not exists(select 1 from public.invoices where id = inv_id and invoice_number like 'INV-%') then
    raise exception 'Invoice number was not auto-generated';
  end if;

  -- Insert payment and verify reconciliation
  insert into public.payments (invoice_id, payment_number, client_id, amount, payment_date, payment_method, status)
  values (
    inv_id,
    'PAY-00001',
    (select id from public.clients where user_id = '00000000-0000-0000-0000-000000000002'::uuid),
    1180.00,
    current_date,
    'upi',
    'cleared'
  );

  if not exists(select 1 from public.invoices where id = inv_id and status = 'paid' and outstanding_amount = 0.00) then
    raise exception 'Invoice was not reconciled correctly on payment';
  end if;

  if not exists(select 1 from public.general_ledger where reference_type = 'payment' and amount = 1180.00) then
    raise exception 'Ledger entry was not posted on payment reconciliation';
  end if;

  raise notice 'All database unit tests passed successfully!';
end;
$$;

rollback;
