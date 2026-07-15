
-- ============================================
-- BRAND KITS TABLE
-- Stores brand identity for use in generation prompts
-- ============================================
create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  company_name text not null default '',
  brand_colors jsonb default '[]'::jsonb,
  brand_voice text default '',
  logo_url text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for quick lookup
create index brand_kits_user_id_idx on public.brand_kits (user_id);

-- Row Level Security
alter table public.brand_kits enable row level security;

-- Users can view only their own brand kits
create policy "Users can view own brand kits"
  on public.brand_kits for select
  using (auth.uid() = user_id);

-- Users can insert their own brand kits
create policy "Users can create own brand kits"
  on public.brand_kits for insert
  with check (auth.uid() = user_id);

-- Users can update their own brand kits
create policy "Users can update own brand kits"
  on public.brand_kits for update
  using (auth.uid() = user_id);

-- Users can delete their own brand kits
create policy "Users can delete own brand kits"
  on public.brand_kits for delete
  using (auth.uid() = user_id);

-- Trigger to auto-set updated_at
create trigger handle_brand_kits_updated_at
  before update on public.brand_kits
  for each row execute function public.update_updated_at();
