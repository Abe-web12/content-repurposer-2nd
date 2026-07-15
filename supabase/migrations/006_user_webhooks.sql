
-- ============================================
-- USER WEBHOOKS TABLE
-- ============================================
create table public.user_webhooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  name text not null,
  url text not null,
  secret text,
  trigger_events text[] not null default '{}',
  is_active boolean not null default true,
  retry_count integer not null default 0,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_user_webhooks_user_id on public.user_webhooks(user_id);
create index idx_user_webhooks_active on public.user_webhooks(user_id, is_active) where is_active = true;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.user_webhooks enable row level security;

create policy "Users can select own webhooks"
  on public.user_webhooks for select
  using (auth.uid() = user_id);

create policy "Users can insert own webhooks"
  on public.user_webhooks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own webhooks"
  on public.user_webhooks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own webhooks"
  on public.user_webhooks for delete
  using (auth.uid() = user_id);

-- ============================================
-- TRIGGER
-- ============================================
create trigger user_webhooks_updated_at
  before update on public.user_webhooks
  for each row execute procedure public.update_updated_at();
