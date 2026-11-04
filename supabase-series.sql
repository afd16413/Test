-- Run once in the Supabase SQL Editor.
-- Adds a series (e.g. "Academic Test 17") and an activity name (e.g. "Test 1 Reading Passage 1")
-- to each test, so the home page can group them under one heading.
alter table public.tests
  add column if not exists series text,
  add column if not exists label text;
