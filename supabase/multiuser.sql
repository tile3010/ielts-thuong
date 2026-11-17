-- Run once before enabling AUTH_MODE=supabase. Existing single-user tables stay intact.
create table if not exists public.ielts_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Learner', active boolean not null default true,
 daily_ai_limit integer not null default 10 check(daily_ai_limit between 0 and 100),
 created_at timestamptz not null default now()
);
create table if not exists public.ielts_user_progress (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null default '{}'::jsonb, revision bigint not null default 1,
 updated_at timestamptz not null default now()
);
create table if not exists public.ielts_ai_usage (
 user_id uuid references auth.users(id) on delete cascade, day date not null,
 calls integer not null default 0, primary key(user_id,day)
);
alter table public.ielts_members enable row level security;
alter table public.ielts_user_progress enable row level security;
alter table public.ielts_ai_usage enable row level security;
revoke all on public.ielts_members,public.ielts_user_progress,public.ielts_ai_usage from anon,authenticated;
grant select on public.ielts_members,public.ielts_user_progress to authenticated;
drop policy if exists own_member on public.ielts_members;
create policy own_member on public.ielts_members for select to authenticated using(user_id=auth.uid());
drop policy if exists own_progress on public.ielts_user_progress;
create policy own_progress on public.ielts_user_progress for select to authenticated using(user_id=auth.uid());
-- Writes go through the Node backend, which validates the Supabase user on every request.
-- Old push subscriptions have no owner and are intentionally excluded in multi-user mode.
create table if not exists public.ielts_push(id text primary key,subscription jsonb not null,last_day text,created_at timestamptz not null default now());
alter table public.ielts_push add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.ielts_push enable row level security;
revoke all on public.ielts_push from anon,authenticated;
