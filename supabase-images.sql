-- Run once in the Supabase SQL Editor.
-- Adds image storage for writing Task 1 (charts, graphs, diagrams).

-- Public bucket, so the test page can display the image. Only admins can upload or delete.
insert into storage.buckets (id, name, public)
values ('test-images', 'test-images', true)
on conflict (id) do nothing;

create policy "admins upload test images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'test-images' and exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy "admins delete test images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'test-images' and exists (select 1 from public.admins a where a.user_id = auth.uid()));
