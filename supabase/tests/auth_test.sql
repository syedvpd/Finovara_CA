-- auth_test.sql
-- Database verification test script for Supabase Custom JWT Hook.
-- Runs assertions inside a transaction and rolls back.

begin;

-- 1. Mock users and structures if not present
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000010'::uuid, 'hook_test_user@finovara.com')
on conflict do nothing;

-- Ensure public.users has matching role
update public.users
set role_id = (select id from public.roles where code = 'chartered_accountant' limit 1)
where id = '00000000-0000-0000-0000-000000000010'::uuid;

-- Add employee record mapping branch and employee_id
insert into public.employees (user_id, branch_id, designation, department, date_of_joining)
values (
  '00000000-0000-0000-0000-000000000010'::uuid,
  (select id from public.branches limit 1),
  'Senior Auditor',
  'Audit',
  current_date
)
on conflict (user_id) do nothing;

-- 2. Run verification assertions
do $$
declare
  mock_event jsonb;
  result_event jsonb;
  claims jsonb;
  user_uuid uuid := '00000000-0000-0000-0000-000000000010'::uuid;
  expected_role varchar := 'chartered_accountant';
  expected_branch_uuid uuid;
  expected_employee_uuid uuid;
begin
  -- Resolve expected ids
  select id, branch_id into expected_employee_uuid, expected_branch_uuid
  from public.employees
  where user_id = user_uuid;

  -- Prepare test event payload
  mock_event := jsonb_build_object(
    'user_id', user_uuid,
    'claims', jsonb_build_object(
      'sub', user_uuid,
      'role', 'authenticated',
      'user_metadata', jsonb_build_object()
    )
  );

  raise notice 'Executing public.custom_access_token_hook...';
  result_event := public.custom_access_token_hook(mock_event);

  -- Extract claims
  claims := result_event->'claims';

  -- Assertions
  if (claims->>'role') <> expected_role then
    raise exception 'Assertion failed: Expected role %, got %', expected_role, (claims->>'role');
  end if;

  if (claims->'user_metadata'->>'role') <> expected_role then
    raise exception 'Assertion failed: Expected user_metadata.role %, got %', expected_role, (claims->'user_metadata'->>'role');
  end if;

  if (claims->'user_metadata'->>'branch_id')::uuid <> expected_branch_uuid then
    raise exception 'Assertion failed: Expected branch_id %, got %', expected_branch_uuid, (claims->'user_metadata'->>'branch_id');
  end if;

  if (claims->'user_metadata'->>'employee_id')::uuid <> expected_employee_uuid then
    raise exception 'Assertion failed: Expected employee_id %, got %', expected_employee_uuid, (claims->'user_metadata'->>'employee_id');
  end if;

  if (claims->'user_metadata'->>'client_id') <> 'null' then
    raise exception 'Assertion failed: Expected client_id to be null, got %', (claims->'user_metadata'->>'client_id');
  end if;

  raise notice 'All Supabase Custom Access Token claims assertions passed successfully!';
end;
$$;

rollback;
