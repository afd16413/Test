-- Run once in the Supabase SQL Editor, after the earlier SQL files.
-- Adds: reading and listening attempts in submissions, teacher comments and band scores.

-- 1. Allow reading and listening attempts in the submissions table.
alter table public.submissions drop constraint if exists submissions_kind_check;
alter table public.submissions
  add constraint submissions_kind_check check (kind in ('reading', 'listening', 'writing', 'speaking'));

-- 2. The original Academic Reading 17 test is a static page, not a row in "tests",
--    so its attempts cannot reference that table.
alter table public.submissions drop constraint if exists submissions_test_id_fkey;

-- 3. Teacher feedback on every submission.
alter table public.submissions
  add column if not exists teacher_comment text,
  add column if not exists band numeric(2,1),
  add column if not exists reviewed_at timestamptz;

-- 4. Only admins can change a submission (to add a comment or band).
--    Students can already read their own rows, so they see the feedback.
create policy "admins review submissions"
  on public.submissions for update
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));
