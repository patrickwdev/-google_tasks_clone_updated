-- Add category to tasks (Work, Personal, Shopping, Health, New)
alter table public.tasks add column if not exists category text;
