-- Run once in the Supabase SQL Editor.
-- Lets admins change a test's group (series) from the Manage tests page.

create policy "admins update tests"
  on public.tests for update
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));
