-- Risk level enum (reuse-safe)
do $$ begin
  create type public.risk_level as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;

-- Preferences table
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  phone_number text,
  min_risk_level public.risk_level not null default 'medium',
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "Users view own preferences"
  on public.notification_preferences
  for select to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own preferences"
  on public.notification_preferences
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own preferences"
  on public.notification_preferences
  for update to authenticated
  using (auth.uid() = user_id);

create policy "Users delete own preferences"
  on public.notification_preferences
  for delete to authenticated
  using (auth.uid() = user_id);

-- Updated-at trigger (reuses existing set_updated_at function)
drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- Auto-create preferences row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into public.user_roles (user_id, role)
  values (new.id, 'citizen');
  insert into public.notification_preferences (user_id)
  values (new.id);
  return new;
end;
$$;

-- Ensure trigger exists on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();