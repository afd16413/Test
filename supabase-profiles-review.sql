-- Run once in the Supabase SQL Editor.
-- Adds student names (profiles) so admins can see who sent each answer.

-- 1. One profile per account, holding the name typed at registration and the email.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default ''
);

alter table public.profiles enable row level security;

create policy "users read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "admins read all profiles"
  on public.profiles for select
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- 2. Create the profile automatically whenever a new account is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Fill in profiles for accounts that already exist.
insert into public.profiles (id, full_name, email)
select id, coalesce(raw_user_meta_data->>'full_name', ''), coalesce(email, '')
from auth.users
on conflict (id) do nothing;
