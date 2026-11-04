-- Run once in the Supabase SQL Editor, after supabase-setup.sql.
-- Adds: test type on each test, audio uploads for listening, and storage for writing/speaking answers.

-- 1. Each test records its type (reading, listening, writing or speaking).
alter table public.tests add column if not exists kind text not null default 'reading';

-- 2. Listening audio: a public bucket, so the audio player can load the file.
--    Only admins can upload or delete.
insert into storage.buckets (id, name, public)
values ('test-audio', 'test-audio', true)
on conflict (id) do nothing;

create policy "admins upload test audio"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'test-audio' and exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy "admins delete test audio"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'test-audio' and exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- 3. Speaking recordings: a private bucket. Files go in a folder named after the student's user id.
insert into storage.buckets (id, name, public)
values ('speaking-recordings', 'speaking-recordings', false)
on conflict (id) do nothing;

create policy "students upload their own recordings"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'speaking-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "admins read recordings"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'speaking-recordings' and exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- 4. Writing and speaking submissions.
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  test_id text not null references public.tests (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('writing', 'speaking')),
  answers jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.submissions enable row level security;

create policy "students add their own submissions"
  on public.submissions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "students read their own submissions"
  on public.submissions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "admins read all submissions"
  on public.submissions for select
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));
