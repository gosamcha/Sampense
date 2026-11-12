-- Run once in Supabase SQL Editor. Compatible with an existing app_records table.
begin;
create table if not exists public.app_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  store_name text not null,
  record_key text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, store_name, record_key)
);
create unique index if not exists app_records_user_store_key
  on public.app_records(user_id, store_name, record_key);
alter table public.app_records enable row level security;
revoke all on public.app_records from anon;
grant select, insert, update, delete on public.app_records to authenticated;
drop policy if exists sampense_owner on public.app_records;
create policy sampense_owner on public.app_records for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Restrictive policy also constrains any pre-existing permissive policies.
drop policy if exists sampense_owner_guard on public.app_records;
create policy sampense_owner_guard on public.app_records as restrictive for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
commit;
