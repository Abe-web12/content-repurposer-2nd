-- ============================================
-- RPC FUNCTIONS FOR BILLING
-- Run these in your Supabase SQL Editor
-- ============================================

-- Atomically increment generations_used and return the new count.
-- Used by POST /api/generate to deduct a credit before streaming.
-- Returns the updated generations_used value so the server can verify
-- the plan limit wasn't exceeded by concurrent requests.
create or replace function public.increment_generations_used(user_id uuid)
returns int
language sql
as $$
  update public.profiles
  set generations_used = generations_used + 1
  where id = user_id
  returning generations_used;
$$;

-- Atomically decrement generations_used and return the new count.
-- Used to refund a credit when a generation fails mid-stream or when
-- the atomic limit check detects the plan was exceeded.
create or replace function public.decrement_generations_used(user_id uuid)
returns int
language sql
as $$
  update public.profiles
  set generations_used = greatest(0, generations_used - 1)
  where id = user_id
  returning generations_used;
$$;
