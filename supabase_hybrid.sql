-- supabase_hybrid.sql
-- Run AFTER supabase_setup.sql (chunks table + match_chunks RPC must exist first).
--
-- Adds Spanish full-text search (FTS) to the chunks table and creates the
-- hybrid_match_chunks function that combines semantic (vector) and keyword
-- (full-text) retrieval using Reciprocal Rank Fusion (RRF).
--
-- RRF (Reciprocal Rank Fusion):
--   Each retrieval strategy ranks the results independently; the final score
--   is the sum of reciprocal ranks with a smoothing constant k:
--     score = semantic_weight / (k + semantic_rank) + full_text_weight / (k + fts_rank)
--   This avoids score-space normalization across incompatible scales and
--   gracefully handles results that appear in only one strategy.
--   A higher k de-emphasizes the rank difference between top results.

-- ---------------------------------------------------------------------------
-- 0. Raise maintenance memory for this session.
--    Adding a STORED generated column rewrites the table, which rebuilds the
--    ivfflat vector index — that needs ~41 MB, above the Supabase free-tier
--    default of 32 MB. This bump is session-scoped and safe.
-- ---------------------------------------------------------------------------

set maintenance_work_mem = '128MB';

-- ---------------------------------------------------------------------------
-- 1. FTS column + index (idempotent)
-- ---------------------------------------------------------------------------

alter table chunks
  add column if not exists fts tsvector
    generated always as (to_tsvector('spanish', content)) stored;

create index if not exists chunks_fts_idx on chunks using gin (fts);

-- ---------------------------------------------------------------------------
-- 2. hybrid_match_chunks function
-- ---------------------------------------------------------------------------

create or replace function hybrid_match_chunks(
  query_text        text,
  query_embedding   vector(1024),
  match_count       int,
  full_text_weight  float default 1.0,
  semantic_weight   float default 1.0,
  rrf_k             int   default 50
)
returns table (
  id           uuid,
  content      text,
  source_doc   text,
  metadata     jsonb,
  similarity   float,
  keyword_hit  boolean
)
language sql stable
as $$
  with semantic as (
    select
      c.id,
      row_number() over (order by c.embedding <=> query_embedding) as rank,
      1 - (c.embedding <=> query_embedding)                        as similarity
    from chunks c
    order by c.embedding <=> query_embedding
    limit greatest(match_count * 2, 20)
  ),
  full_text as (
    select
      c.id,
      row_number() over (
        order by ts_rank_cd(c.fts, websearch_to_tsquery('spanish', query_text)) desc
      ) as rank
    from chunks c
    where
      -- Guard: empty query_text produces a tsquery that matches nothing,
      -- so no rows pass the WHERE; semantic results still surface below.
      length(trim(query_text)) > 0
      and c.fts @@ websearch_to_tsquery('spanish', query_text)
    limit greatest(match_count * 2, 20)
  ),
  rrf as (
    select
      coalesce(s.id, f.id) as id,
      coalesce(semantic_weight / (rrf_k + s.rank), 0)
        + coalesce(full_text_weight / (rrf_k + f.rank), 0) as rrf_score,
      coalesce(s.similarity, 0)                             as similarity,
      (f.rank is not null)                                  as keyword_hit
    from semantic s
    full outer join full_text f on s.id = f.id
  )
  select
    c.id,
    c.content,
    c.source_doc,
    c.metadata,
    rrf.similarity,
    rrf.keyword_hit
  from rrf
  join chunks c on c.id = rrf.id
  order by rrf.rrf_score desc
  limit match_count;
$$;
