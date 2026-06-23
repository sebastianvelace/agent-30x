# agent-30x — Claude Code Instructions

## Project context

This is a technical assessment for 30X, a Latin American business school.
The deliverable is a conversational onboarding agent that answers new team member questions
using RAG over 30X's internal PDF documents.

**30X evaluates not just the final product but the process**: commit history, architecture decisions,
how AI was used to build faster and better, and what gaps were found in the source documents.
Every commit is part of the deliverable.

## Commit discipline (CRITICAL)

**Commit after every meaningful unit of work.** The commit history must tell the story of how
the project was built — reviewers at 30X will read it as a window into how you think and execute.

### When to commit

Commit immediately after completing any of these:

- Project scaffolding or directory structure created
- A new file or module is written and working
- A bug is found and fixed (include the root cause in the message)
- An architecture decision is implemented (e.g. lazy client initialization, chunking strategy)
- A dependency conflict is resolved
- A configuration is finalized (Supabase SQL, env vars, CORS, Procfile)
- The ingestion pipeline runs successfully end-to-end
- The backend API is verified locally
- The frontend UI is styled and working
- Deploy to Railway or Vercel succeeds
- Any iteration or improvement after testing

### Commit message format

Use conventional commits. Keep the subject line under 72 characters.
Add a body when the WHY is non-obvious.

```
type(scope): short description

Why this was needed or what problem it solves.
Non-obvious constraint or tradeoff, if any.
```

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`

**Scopes:** `backend`, `frontend`, `ingestion`, `agent`, `infra`, `docs`

### Examples that reflect good AI-assisted development

```
feat(infra): scaffold backend and frontend directory structure

chore(backend): add requirements.txt with pinned dependencies

feat(ingestion): implement PDF parser and semantic chunker

fix(backend): use lazy client initialization for Supabase and Voyage AI

  Eager initialization at import time caused startup failures when
  env vars were not yet loaded. Switched to lru_cache factory functions.

feat(agent): implement RAG retrieval with cosine similarity search

feat(agent): add escalation logic when similarity score falls below threshold

feat(frontend): build chat UI with 30X brand identity (black + #c8ff00 accent)

feat(frontend): add suggested questions from 30X onboarding FAQ

fix(backend): resolve httpx version conflict between anthropic and supabase

  supabase==2.10.0 requires httpx<0.28, anthropic==0.40.0 allows any <1.
  Removed pinned httpx from requirements.txt and let pip resolve.

chore(infra): add Supabase pgvector setup SQL and .env.example files

docs: rewrite README with architecture diagrams and deployment guide

chore(docs): document identified gaps in 30X onboarding documents
```

### Anti-patterns to avoid

- `git commit -m "updates"` — tells nothing
- `git commit -m "fix bug"` — which bug? why did it happen?
- One giant commit at the end — destroys the narrative
- Skipping commits when something "just works" — those are the most telling moments

## Architecture decisions already made

These are documented so future sessions don't re-derive them:

1. **RAG over context stuffing** — 10-15x cheaper at scale; survives document growth without code changes
2. **Voyage AI over OpenAI embeddings** — Anthropic acquisition, better MTEB scores for Spanish, single API key
3. **Supabase pgvector over Pinecone/Qdrant** — standard PostgreSQL, no vendor lock-in, inspectable with SQL
4. **Session memory on client** — stateless backend, React state holds history, sufficient for short onboarding sessions
5. **Lazy client initialization** — Supabase and Anthropic clients use `lru_cache` factory to avoid import-time failures
6. **500-token chunks with 50-token overlap** — prevents context cuts at chunk boundaries

## Stack

| Layer | Technology |
|-------|-----------|
| LLM | Claude Sonnet 4.6 |
| Embeddings | Voyage AI voyage-3 |
| Vector store | Supabase pgvector |
| Backend | FastAPI + Railway |
| Frontend | Next.js 15 + Tailwind CSS + Vercel |

## Repository structure

```
agent-30x/
├── backend/
│   ├── api/           # FastAPI app, routes, Pydantic models
│   ├── agent/         # RAG retriever, Claude client, system prompt
│   ├── ingestion/     # PDF parser, chunker, Voyage AI embedder
│   └── scripts/       # CLI ingestion tool
├── frontend/
│   └── src/
│       ├── app/       # Next.js App Router pages
│       ├── components/ # Chat, Message, Input components
│       └── types/     # Shared TypeScript types
├── docs/              # 30X PDFs (gitignored)
└── supabase_setup.sql # Run once in Supabase SQL Editor
```

## Identified gaps in 30X documents

Found during development — mention in the process video:

| Gap | Document | Impact |
|-----|----------|--------|
| No offboarding process | None | Agent can't answer "how do I leave the team?" |
| Tool access approval flow | Doc3 (partial) | Agent knows the tools but not who grants access |
| Compensation and benefits | None | High-frequency onboarding question, unaddressed |
| Performance review process | None | New hires ask this in week 1 |
| Timezone / working hours policy | None | Distributed team, critical operational info |
