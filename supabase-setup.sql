-- Run once in the Supabase SQL editor (Dashboard > SQL Editor).
-- Adds the admin list and the shared test library used by tests.html and editor.html.

-- 1. Admins: a user is an admin when their id is in this table.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.admins enable row level security;

-- A signed-in user may check whether they themselves are an admin. Nothing else.
create policy "users can read their own admin row"
  on public.admins for select
  to authenticated
  using (auth.uid() = user_id);

-- 2. Tests: one row per published test. "html" is the complete standalone test page.
create table if not exists public.tests (
  id text primary key,
  title text not null,
  minutes integer not null default 20,
  html text not null,
  created_at timestamptz not null default now()
);

alter table public.tests enable row level security;

-- Any signed-in student can list and open tests.
create policy "signed-in users can read tests"
  on public.tests for select
  to authenticated
  using (true);

-- Only admins can add or delete tests.
create policy "admins can add tests"
  on public.tests for insert
  to authenticated
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy "admins can delete tests"
  on public.tests for delete
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- 3. Make yourself an admin. Run this after you have registered/signed in with your account.
insert into public.admins (user_id)
select id from auth.users where email = 'ahmetfurkandemircan@gmail.com'
on conflict do nothing;
