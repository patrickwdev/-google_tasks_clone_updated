-- Tasks table: one row per task, owned by auth.users
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  details text,
  is_completed boolean not null default false,
  date timestamptz,
  list_id text not null default 'default',
  location_reminder jsonb,
  subtasks jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for listing a user's tasks
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_user_id_date_idx on public.tasks(user_id, date);

-- Row Level Security: users can only access their own tasks
alter table public.tasks enable row level security;

create policy "Users can view own tasks"
  on public.tasks for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete
  to authenticated
  using (auth.uid() = user_id);

-- Optional: keep updated_at in sync (Supabase can do this via trigger or app sets it)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();
