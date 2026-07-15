
-- Enable pgvector extension (run in Supabase SQL Editor)
create extension if not exists vector;

-- Add embedding column to voice_profiles
alter table public.voice_profiles
add column if not exists embedding vector(768);

-- Index for similarity search
create index if not exists idx_voice_profiles_embedding
on public.voice_profiles
using ivfflat (embedding vector_cosine_ops)
with (lists = 10);

-- Similarity search function for voice profiles
create or replace function match_voice_profiles(
  query_embedding vector(768),
  match_user_id uuid,
  match_count int default 1
)
returns table (
  id uuid,
  name text,
  similarity float
)
language sql stable
as $$
  select
    voice_profiles.id,
    voice_profiles.name,
    1 - (voice_profiles.embedding <=> query_embedding) as similarity
  from voice_profiles
  where voice_profiles.user_id = match_user_id
    and voice_profiles.embedding is not null
  order by voice_profiles.embedding <=> query_embedding
  limit match_count;
$$;