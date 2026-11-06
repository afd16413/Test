-- Run once in the Supabase SQL Editor.
-- Creates the "results" table: one row per finished reading test, written by templates/reading.html
-- and read by results.html ("My results").

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  test_id text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  score integer not null,
  total integer not null,
  answers jsonb,
  submitted_at timestamptz not null default now()
);

-- Static reading tests (e.g. the Academic Reading 17 test 1 page) are not rows in "tests",
-- so test_id is plain text with no foreign key.

alter table public.results enable row level security;

create policy "students save their own results"
  on public.results for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "students read their own results"
  on public.results for select
  to authenticated
  using (auth.uid() = user_id);

create policy "admins read all results"
  on public.results for select
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));
