-- 20260721000003_auth.sql
-- Supabase Authentication - Custom Access Token Hook Setup

-- 1. Create the Custom Access Token Hook function
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb as $$
declare
  claims jsonb;
  input_user_id uuid;
  user_role varchar;
  user_branch_id uuid;
  user_client_id uuid;
  user_employee_id uuid;
begin
  -- Fetch user_id from the hook input event
  input_user_id := (event->>'user_id')::uuid;

  -- Fetch metadata from public.users and public.roles
  select r.code into user_role
  from public.users u
  join public.roles r on u.role_id = r.id
  where u.id = input_user_id;

  -- Resolve employee_id and branch_id
  select id, branch_id into user_employee_id, user_branch_id
  from public.employees
  where user_id = input_user_id;

  -- If not an employee, resolve client_id and branch_id
  if user_employee_id is null then
    select id, branch_id into user_client_id, user_branch_id
    from public.clients
    where user_id = input_user_id;
  end if;

  -- Retrieve current claims from the event payload
  claims := event->'claims';

  -- Inject custom metadata parameters to the claims payload
  claims := jsonb_set(claims, '{role}', to_jsonb(coalesce(user_role, 'client')));
  claims := jsonb_set(claims, '{user_metadata, role}', to_jsonb(coalesce(user_role, 'client')));
  
  if user_branch_id is not null then
    claims := jsonb_set(claims, '{user_metadata, branch_id}', to_jsonb(user_branch_id));
  else
    claims := jsonb_set(claims, '{user_metadata, branch_id}', 'null'::jsonb);
  end if;
  
  if user_client_id is not null then
    claims := jsonb_set(claims, '{user_metadata, client_id}', to_jsonb(user_client_id));
  else
    claims := jsonb_set(claims, '{user_metadata, client_id}', 'null'::jsonb);
  end if;

  if user_employee_id is not null then
    claims := jsonb_set(claims, '{user_metadata, employee_id}', to_jsonb(user_employee_id));
  else
    claims := jsonb_set(claims, '{user_metadata, employee_id}', 'null'::jsonb);
  end if;

  -- Return updated event containing custom JWT claims
  return jsonb_set(event, '{claims}', claims);
end;
$$ language plpgsql stable security definer;

-- 2. Configure permissions for Supabase Auth to execute the hook
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;

-- 3. Register the hook in the auth.hooks configuration schema if table exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'hooks') then
    insert into auth.hooks (hook_name, hook_type, function_name)
    values ('custom_access_token', 'pg_function', 'public.custom_access_token_hook')
    on conflict (hook_name) do update set function_name = excluded.function_name;
  end if;
end;
$$;
