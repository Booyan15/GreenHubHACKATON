alter table public.farms
  add column if not exists boundary jsonb;
