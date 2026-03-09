-- Add item_type to distinguish events (from Add Item → Event) vs tasks
alter table public.tasks
  add column if not exists item_type text;

comment on column public.tasks.item_type is 'event | task; events show title on calendar under date';
