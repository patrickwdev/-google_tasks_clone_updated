-- Add reminders column: array of ISO timestamptz strings for date/time reminders
alter table public.tasks
  add column if not exists reminders jsonb default '[]'::jsonb;

comment on column public.tasks.reminders is 'Array of reminder date/time strings (ISO 8601)';
