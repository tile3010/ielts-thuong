-- Personal app: only the authenticated Node backend accesses this table.
-- No browser/anonymous access policies are granted.
create table if not exists public.ielts_progress (
  id text primary key check (id = 'thuong'),
  state jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.ielts_progress enable row level security;
revoke all on public.ielts_progress from anon, authenticated;
grant select, insert, update on public.ielts_progress to service_role;

comment on table public.ielts_progress is
  'Single-user IELTS progress. Accessible only through password-protected Node backend.';
