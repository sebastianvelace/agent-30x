-- Feedback table — powers the "living gap report".
-- Run this once in the Supabase SQL Editor (in addition to supabase_setup.sql).

create table if not exists feedback (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  rating      text,                       -- 'up' | 'down' | null (null = logged without explicit rating)
  escalated   boolean default false,      -- true when the agent had no grounded answer
  sources     jsonb default '[]',
  created_at  timestamptz default now()
);

create index if not exists feedback_created_at_idx on feedback (created_at desc);

-- Gap report: questions the agent could not answer or that users marked unhelpful,
-- grouped to surface what the onboarding documents are missing.
create or replace view knowledge_gaps as
  select
    question,
    count(*)                                   as times_asked,
    sum((escalated)::int)                      as times_escalated,
    sum((rating = 'down')::int)                as thumbs_down,
    max(created_at)                            as last_asked
  from feedback
  where escalated = true or rating = 'down'
  group by question
  order by times_asked desc;
