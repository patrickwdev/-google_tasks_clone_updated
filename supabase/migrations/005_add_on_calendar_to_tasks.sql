-- For events: when false, event has a date (for event list) but is not shown on the calendar grid
alter table public.tasks
  add column if not exists on_calendar boolean default true;

comment on column public.tasks.on_calendar is 'When false, event is not shown on calendar grid but still has a date for the event list';
