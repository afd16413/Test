-- Run once in the Supabase SQL Editor.
-- Adds a list of groups, so a group can exist before any test is in it.

create table if not exists public.test_groups (
  name text primary key
);

alter table public.test_groups enable row level security;

-- Signed-in users can see the groups (the editor offers them as choices).
create policy "signed-in users read groups"
  on public.test_groups for select
  to authenticated
  using (true);

-- Only admins can create or remove groups.
create policy "admins create groups"
  on public.test_groups for insert
  to authenticated
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy "admins remove groups"
  on public.test_groups for delete
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Existing groups become rows in the list.
insert into public.test_groups (name)
select distinct series from public.tests
where series is not null and series <> ''
on conflict (name) do nothing;
