create extension if not exists vector;

create table chunks (
  id          uuid primary key default gen_random_uuid(),
  content     text not null,
  embedding   vector(1024),
  source_doc  text not null,
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);

create index on chunks
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

create or replace function match_chunks(
  query_embedding vector(1024),
  match_threshold float,
  match_count     int
)
returns table (
  id         uuid,
  content    text,
  source_doc text,
  metadata   jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    content,
    source_doc,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from chunks
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
