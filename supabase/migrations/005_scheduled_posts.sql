
-- ============================================
-- SCHEDULED POSTS TABLE
-- ============================================
create table public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  content text not null,
  platform text not null check (platform in ('linkedin', 'twitter', 'blog', 'other')),
  scheduled_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'posted')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_scheduled_posts_user_id on public.scheduled_posts(user_id);
create index idx_scheduled_posts_status on public.scheduled_posts(user_id, status);
create index idx_scheduled_posts_scheduled_at on public.scheduled_posts(scheduled_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.scheduled_posts enable row level security;

create policy "Users can select own scheduled posts"
  on public.scheduled_posts for select
  using (auth.uid() = user_id);

create policy "Users can insert own scheduled posts"
  on public.scheduled_posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own scheduled posts"
  on public.scheduled_posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own scheduled posts"
  on public.scheduled_posts for delete
  using (auth.uid() = user_id);

-- ============================================
-- TRIGGER
-- ============================================
create trigger scheduled_posts_updated_at
  before update on public.scheduled_posts
  for each row execute procedure public.update_updated_at();
