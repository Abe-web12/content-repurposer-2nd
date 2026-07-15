
-- Enable extensions
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  tone_profile jsonb default '{}',
  plan text default 'free' check (plan in ('free', 'starter', 'pro')),
  generations_used int default 0,
  generations_limit int default 3,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- VOICE PROFILES TABLE
-- ============================================
create table public.voice_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  name text not null,
  description text,
  tone text not null default 'formal' check (tone in ('formal', 'casual', 'witty', 'authoritative', 'friendly')),
  example_posts text[] default '{}',
  is_default boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- GENERATIONS TABLE
-- ============================================
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  input_type text not null check (input_type in ('youtube_url', 'blog_url', 'podcast_url', 'raw_text')),
  input_content text not null,
  extracted_content text,
  output_format text not null check (output_format in ('linkedin_post', 'linkedin_carousel', 'twitter_thread')),
  output_content text not null,
  voice_profile_id uuid references public.voice_profiles on delete set null,
  tokens_used int,
  model_used text,
  is_favorite boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- USAGE LOG TABLE
-- ============================================
create table public.usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  generation_id uuid references public.generations on delete set null,
  action text not null check (action in ('generation', 'regeneration')),
  credits_consumed int default 1,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_profiles_email on public.profiles(email);
create index idx_profiles_stripe_customer on public.profiles(stripe_customer_id);
create index idx_voice_profiles_user_id on public.voice_profiles(user_id);
create index idx_voice_profiles_default on public.voice_profiles(user_id, is_default) where is_default = true;
create index idx_generations_user_id on public.generations(user_id);
create index idx_generations_created_at on public.generations(created_at desc);
create index idx_generations_user_format on public.generations(user_id, output_format);
create index idx_generations_favorites on public.generations(user_id, is_favorite) where is_favorite = true;
create index idx_usage_log_user_id on public.usage_log(user_id);
create index idx_usage_log_period on public.usage_log(user_id, created_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.profiles enable row level security;
alter table public.voice_profiles enable row level security;
alter table public.generations enable row level security;
alter table public.usage_log enable row level security;

-- PROFILES policies
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- VOICE PROFILES policies
create policy "Users can select own voice profiles"
  on public.voice_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own voice profiles"
  on public.voice_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own voice profiles"
  on public.voice_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own voice profiles"
  on public.voice_profiles for delete
  using (auth.uid() = user_id);

-- GENERATIONS policies
create policy "Users can select own generations"
  on public.generations for select
  using (auth.uid() = user_id);

create policy "Users can insert own generations"
  on public.generations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own generations"
  on public.generations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own generations"
  on public.generations for delete
  using (auth.uid() = user_id);

-- USAGE LOG policies
create policy "Users can read own usage"
  on public.usage_log for select
  using (auth.uid() = user_id);

create policy "Users can insert own usage"
  on public.usage_log for insert
  with check (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update timestamp function
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Auto-update updated_at on profiles
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

-- Ensure only one default voice profile per user
create or replace function public.ensure_single_default_voice()
returns trigger as $$
begin
  if new.is_default = true then
    update public.voice_profiles
    set is_default = false
    where user_id = new.user_id
      and id != new.id
      and is_default = true;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger voice_profile_single_default
  before insert or update on public.voice_profiles
  for each row execute procedure public.ensure_single_default_voice();

-- Reset monthly usage (call via Supabase cron or external cron)
create or replace function public.reset_monthly_usage()
returns void as $$
begin
  update public.profiles
  set generations_used = 0, updated_at = now()
  where plan in ('starter', 'pro');
end;
$$ language plpgsql security definer;