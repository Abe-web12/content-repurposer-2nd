-- ============================================
-- FIX: Ensure profiles table has all columns
-- ============================================

-- Add missing columns safely (no-op if already exist)
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists tone_profile jsonb default '{}',
  add column if not exists plan text default 'free' check (plan in ('free', 'starter', 'pro')),
  add column if not exists generations_used int default 0,
  add column if not exists generations_limit int default 3,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists updated_at timestamptz default now();

-- Ensure RLS is enabled
alter table public.profiles enable row level security;

-- Re-create policies idempotently
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Ensure auto-profile trigger exists
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Ensure updated_at trigger exists
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
