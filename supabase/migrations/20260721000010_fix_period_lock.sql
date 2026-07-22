-- 20260721000010_fix_period_lock.sql
-- Fixes assert_period_open().
--
-- The previous version referenced new.voucher_date and new.issue_date directly.
-- PL/pgSQL resolves field access at runtime against the actual row type, so on
-- a table without a voucher_date column the statement failed with
-- "record new has no field voucher_date" before coalesce was ever evaluated.
-- Reading through to_jsonb() looks the key up instead, which safely yields NULL
-- when the column is absent, so one function serves every table.

create or replace function public.assert_period_open()
returns trigger as $$
declare
  row_json  jsonb := to_jsonb(new);
  entry_date date;
  locked     boolean;
  year_label text;
begin
  entry_date := coalesce(
    nullif(row_json->>'voucher_date', '')::date,
    nullif(row_json->>'issue_date', '')::date,
    nullif(row_json->>'entry_date', '')::date,
    nullif(row_json->>'payment_date', '')::date,
    current_date
  );

  select fy.is_locked, fy.label
    into locked, year_label
  from public.financial_years fy
  where entry_date between fy.start_date and fy.end_date
  limit 1;

  if coalesce(locked, false) then
    raise exception '% is locked and cannot accept new entries dated %.',
      coalesce(year_label, 'That financial year'), entry_date
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$ language plpgsql;
