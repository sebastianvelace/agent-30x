# agent-30x

Conversational onboarding agent for 30X — answers questions from new team members based exclusively on the organization's internal knowledge base.

Built with RAG (Retrieval-Augmented Generation) on 30X internal documents, Claude Sonnet as the LLM, Voyage AI for semantic embeddings, and Supabase pgvector as the vector store.

> **Live demo:** https://agent-30x.vercel.app
>
> Backend API: https://agent-30x.onrender.com (Render free tier — the first request after idle may take ~50s to wake up).

---

## Table of contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Document ingestion](#document-ingestion)
- [Running locally](#running-locally)
- [Production deploy](#production-deploy)
- [Updating the knowledge base](#updating-the-knowledge-base)
- [Architecture decisions](#architecture-decisions)
- [Identified gaps in the source documents](#identified-gaps-in-the-source-documents)
- [Repository structure](#repository-structure)

---

## Architecture

The system runs in two fully independent phases:

### Phase 1 — Ingestion (run once, or when documents change)

```
30X PDFs
    │
    ▼
Text extraction (pdfplumber)
    │
    ▼
Semantic chunking (~250 tokens, 30-token overlap)
    │
    ▼
Voyage AI voyage-3 → vector embeddings
    │
    ▼
Supabase pgvector → persistent storage
```

### Phase 2 — Conversation (every user message)

```
User message
    │
    ▼
Voyage AI → message embedding
    │
    ▼
Supabase pgvector → hybrid retrieval (top-5 chunks)
  ├── Semantic: cosine similarity (voyage-3 embeddings)
  └── Full-text: Spanish keyword search (tsvector GIN index)
       Combined via Reciprocal Rank Fusion (RRF)
    │
    ▼
Prompt construction:
  - System prompt with agent rules
  - Retrieved chunks as grounding context
  - Session conversation history
    │
    ▼
Claude Sonnet 4.6 → grounded response
    │
    ▼
If no semantic match above threshold AND no keyword hit → escalate to Chief of Staff
```

> **One-time Supabase setup:** run the three SQL files in order — `supabase_setup.sql`,
> `supabase_hybrid.sql` (run `set maintenance_work_mem='128MB';` first in the same session),
> and `supabase_feedback.sql`. See the [Supabase — database setup](#supabase--database-setup) section for details.

### Full system diagram

```
┌─────────────────────────────────────────────────────────────┐
│                          USER                               │
│                  (browser, any device)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│                FRONTEND — Next.js / Vercel                   │
│           Chat UI · session history in React state           │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────┐
│               BACKEND — FastAPI / Render                     │
│                                                             │
│   POST /chat                                                │
│   ├── Voyage AI  → message embedding                        │
│   ├── Supabase   → hybrid retrieval (top-5 chunks)          │
│   │     ├── Semantic: cosine similarity (voyage-3)          │
│   │     └── Full-text: Spanish keyword search (FTS + RRF)   │
│   ├── Build prompt with context + history                   │
│   └── Claude Sonnet → response                              │
│                                                             │
│   POST /ingest   (protected by X-Api-Key)                   │
│   POST /feedback                                            │
│   GET  /admin/gaps  (protected by X-Api-Key)                │
│   GET  /health                                              │
└────────────┬─────────────────────────┬──────────────────────┘
             │                         │
┌────────────▼──────────┐  ┌───────────▼──────────────────────┐
│  Supabase pgvector    │  │  Anthropic API                   │
│                       │  │  ├── Voyage AI  (embeddings)     │
│  table: chunks        │  │  └── Claude Sonnet (responses)   │
│  ├── id               │  └──────────────────────────────────┘
│  ├── content          │
│  ├── embedding        │
│  ├── source_doc       │
│  └── metadata         │
└───────────────────────┘
```

---

## Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| LLM | Claude Sonnet 4.6 (Anthropic) | Best quality/cost ratio for Spanish responses, long context |
| Embeddings | Voyage AI `voyage-3` | Anthropic's recommended embedding provider (Anthropic acquired Voyage in 2024 but they remain separate services with separate SDKs and keys); strong MTEB retrieval performance for Spanish content |
| Vector store | Supabase pgvector | Standard PostgreSQL with vector extension — no vendor lock-in, plain SQL for inspection and debugging |
| Backend | FastAPI (Python) | Typed, native async, automatic OpenAPI docs |
| Frontend | Next.js 16 + Tailwind CSS | App Router, RSC, Turbopack dev server, native Vercel deploy |
| Backend deploy | Render | CD from GitHub, environment variables in dashboard, free tier (note: ~50s cold start after idle) |
| Frontend deploy | Vercel | CD from GitHub, edge network, zero config |

---

## Prerequisites

- Python 3.11+
- Node.js 20+
- [Supabase](https://supabase.com) account (free tier) — you'll need the project URL and `service_role` key
- [Render](https://render.com) account (free tier)
- [Vercel](https://vercel.com) account (free tier)
- Anthropic API key for Claude ([console.anthropic.com](https://console.anthropic.com))
- Voyage AI API key for embeddings ([dash.voyageai.com](https://dash.voyageai.com), free tier) — separate service and key from Anthropic

---

## Local setup

### 1. Clone the repository

```bash
git clone https://github.com/sebastianvelace/agent-30x.git
cd agent-30x
```

### 2. Backend dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend dependencies

```bash
cd ../frontend
npm install
```

---

## Environment variables

### Backend (`backend/.env`)

```env
# Anthropic — Claude (LLM)
ANTHROPIC_API_KEY=sk-ant-...

# Voyage AI — embeddings (separate service, separate key)
VOYAGE_API_KEY=pa-...

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...          # use service_role key, not anon

# Security
INGEST_API_KEY=any-secret-string-to-protect-the-ingest-endpoint

# Agent configuration
SIMILARITY_THRESHOLD=0.4   # tuned for voyage-3 (cosine scores run low, ~0.24-0.60)
TOP_K_CHUNKS=5

# Hybrid retrieval weights (optional — defaults shown)
FULL_TEXT_WEIGHT=1.0       # weight of Spanish full-text search in RRF fusion
SEMANTIC_WEIGHT=1.0        # weight of semantic (vector cosine) search in RRF fusion
RRF_K=50                   # RRF constant; higher = smoother rank blending
```

> **On the threshold:** voyage-3 produces lower absolute cosine scores than some other embedding models, so a `0.4` threshold — not the more intuitive `0.75` — is what correctly grounds real onboarding questions while still escalating off-topic ones. Re-tune this after ingesting a larger document set.

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000           # In production: Render service URL
NEXT_PUBLIC_CHIEF_OF_STAFF_EMAIL=example@30x.com   # Pre-fills the escalation mailto link
```

### Supabase — database setup

Run the three SQL files in order in your Supabase project's SQL Editor:

1. **`supabase_setup.sql`** — creates the `chunks` table, ivfflat index, and `match_chunks` (semantic search) RPC.
2. **`supabase_hybrid.sql`** — adds the Spanish FTS column (`fts tsvector`), a GIN index on it, and the `hybrid_match_chunks` RPC used by the backend. Before running, execute `set maintenance_work_mem='128MB';` in the same session to speed up the GIN index build.
3. **`supabase_feedback.sql`** — creates the `feedback` table and `knowledge_gaps` view used by `POST /feedback` and `GET /admin/gaps`.

---

## Document ingestion

Place the PDFs in the `docs/` folder and run the ingestion script:

```bash
cd backend
source venv/bin/activate
python -m scripts.ingest --docs-path ../docs/
```

The script runs this pipeline for each PDF:

1. Extracts text with `pdfplumber`
2. Splits into ~250-token chunks with 30-token overlap (smaller chunks improve retrieval granularity and citation precision)
3. Generates embeddings with Voyage AI `voyage-3` in batches of 50 to respect rate limits
4. Inserts into Supabase (use `--replace` or `--reset` flags to avoid duplicates on re-ingestion)

Expected output:

```
[ingest] Processing: 30X_Doc1_Organizacion.pdf
[ingest]   → 6 chunks generated
[ingest] batch 1: 6 chunks stored
[ingest] Processing: 30X_Doc2_Programas_Operacion.pdf
[ingest]   → 5 chunks generated
...
[ingest] ✓ Ingestion complete
```

---

## Running locally

### Backend

```bash
cd backend
source venv/bin/activate
uvicorn api.main:app --reload --port 8000
```

API available at `http://localhost:8000`  
Auto-generated docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm run dev
```

Frontend available at `http://localhost:3000`

---

## Production deploy

### Backend → Render

1. Create a new **Web Service** at [render.com](https://render.com)
2. Connect your GitHub repository
3. Set **Root Directory** to `backend`
4. **Build command:** `pip install -r requirements.txt`
5. **Start command:** `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
6. Choose the **Free** instance type
7. Add environment variables (all keys from the Backend section above) in the Render dashboard
8. Deploy triggers automatically on every push to `main`

> **Cold start:** the Render free tier spins down after ~15 min of inactivity. The first request after idle takes ~50s to wake up. Subsequent requests are fast.

### Frontend → Vercel

1. Import the repository at [vercel.com](https://vercel.com)
2. Set the root directory to `frontend/`
3. Add `NEXT_PUBLIC_API_URL` pointing to your Render service URL (e.g. `https://agent-30x.onrender.com`)
4. Optionally add `NEXT_PUBLIC_CHIEF_OF_STAFF_EMAIL` for the escalation mailto link
5. Deploy triggers automatically on every push to `main`

---

## Updating the knowledge base

When 30X updates, adds, or replaces internal documents:

### Replace an existing document

```bash
# 1. Replace the PDF in docs/
cp new_doc.pdf docs/30X_Doc1_Organizacion.pdf

# 2. The script removes previous chunks automatically with --replace
python -m scripts.ingest --docs-path ../docs/ --replace 30X_Doc1_Organizacion.pdf
```

### Add a new document

```bash
cp new_program.pdf docs/30X_Doc4_NewProgram.pdf
python -m scripts.ingest --docs-path ../docs/ --file 30X_Doc4_NewProgram.pdf
```

### Re-index everything from scratch

```bash
python -m scripts.ingest --docs-path ../docs/ --reset
```

> The system is **content-agnostic**. No code changes are required when the knowledge base changes — just re-index.

---

## Architecture decisions

### Why RAG instead of stuffing the full PDFs into the context window?

The 3 current 30X documents fit in Claude Sonnet's context window. Technically, the simplest solution is to include them in every request. But that has two structural problems:

**Cost:** Sending ~30,000 tokens of context per message vs. ~2,000 tokens of relevant chunks is a 10-15x cost difference per conversation. At scale with dozens of simultaneous users, that's significant.

**Scalability:** 30X is actively expanding. When new programs, countries, HR policies, or operational guides are added, the RAG system only requires re-indexing. A context-stuffing approach requires manual prompt review and context size management every time documents grow.

### Why Voyage AI and not OpenAI embeddings?

Voyage AI was acquired by Anthropic in November 2024 and is Anthropic's officially recommended embedding provider — Anthropic's own API has no embeddings endpoint. Note that despite the acquisition, Voyage remains a separate service: it has its own SDK (`voyageai`) and its own API key, distinct from the Anthropic key used for Claude. Its `voyage-3` model performs strongly on MTEB benchmarks for Spanish and enterprise content retrieval, which is what this onboarding use case needs.

### Why Supabase pgvector and not Pinecone/Qdrant?

Supabase pgvector is standard PostgreSQL with a vector extension. That means: no vendor lock-in, plain SQL queries for inspection and debugging, and the ability to add relational columns (e.g. `area`, `effective_date`) without migrating platforms. For this application's volume (~100 chunks), any vector store works — the choice is based on long-term maintainability.

### Session memory on the client, not the server

Conversation history lives in React state on the frontend and is sent with each request. This keeps the backend stateless, eliminates server-side session management, and is sufficient for onboarding use cases where sessions are short.

---

## Identified gaps in the source documents

During development, the following onboarding questions were found that the current documents do not answer:

| Question | Document | Status |
|----------|----------|--------|
| What is the offboarding process? | None | Not documented |
| Who approves access to each tool? | Doc3 mentions tools but not the access request process | Incomplete |
| What is the compensation and benefits policy? | None | Not documented |
| Is there a formal feedback or performance review process? | None | Not documented |
| What are the working hours or timezone policy? | None | Not documented |

These gaps are documented here so the 30X team can address them in a future version of the onboarding documents.

---

## Repository structure

```
agent-30x/
├── backend/
│   ├── api/
│   │   ├── main.py          # FastAPI app, CORS, routers
│   │   ├── routes/
│   │   │   ├── chat.py      # POST /chat
│   │   │   ├── ingest.py    # POST /ingest (protected by X-Api-Key)
│   │   │   ├── feedback.py  # POST /feedback (thumbs up/down logging)
│   │   │   └── admin.py     # GET /admin/gaps (protected by X-Api-Key)
│   │   └── models.py        # Pydantic schemas
│   ├── agent/
│   │   ├── retriever.py     # Hybrid retrieval (semantic + Spanish FTS via RRF)
│   │   ├── llm.py           # Claude client, query cache, escalation logic
│   │   └── prompts.py       # Agent system prompt
│   ├── ingestion/
│   │   ├── parser.py        # PDF text extraction (pdfplumber)
│   │   ├── chunker.py       # 250-token chunks with 30-token overlap
│   │   └── embedder.py      # Voyage AI voyage-3 embeddings + Supabase insert
│   ├── scripts/
│   │   └── ingest.py        # Ingestion CLI (--file, --replace, --reset)
│   ├── tests/
│   │   ├── test_citations_mocked.py    # Citation structure tests (mocked)
│   │   └── test_hybrid_escalation.py  # Escalation logic tests (mocked)
│   ├── requirements.txt
│   ├── requirements-dev.txt  # Test dependencies (pytest)
│   └── Procfile             # Render: web: uvicorn api.main:app --host 0.0.0.0 --port $PORT
├── frontend/
│   ├── public/                 # 30X logo assets (theme-aware wordmark + favicon)
│   └── src/
│       ├── app/
│       │   ├── page.tsx        # Main chat page + sidebar
│       │   ├── gaps/
│       │   │   └── page.tsx    # Admin gap dashboard (key-protected)
│       │   ├── layout.tsx      # Root layout, ThemeProvider, fonts, metadata
│       │   └── globals.css     # Theme variables (dark/light) + markdown styles
│       ├── components/
│       │   ├── Chat.tsx        # Chat state, history, feedback, suggested questions
│       │   ├── Message.tsx     # Message bubble, markdown render, copy, sources, citations
│       │   ├── Input.tsx       # Auto-growing input with send
│       │   ├── Logo.tsx        # Theme-aware 30X wordmark
│       │   ├── ThemeToggle.tsx # Light/dark switch (next-themes)
│       │   ├── IntroHero.tsx   # Welcome screen (shown once per session)
│       │   ├── KnowledgePanel.tsx  # Drawer: knowledge base browser
│       │   └── FirstWeekPanel.tsx  # Drawer: interactive first-week checklist
│       ├── hooks/
│       │   └── useChatHistory.ts  # localStorage conversation history hook
│       └── types/
│           └── chat.ts         # Shared message + citation types
├── docs/                    # Knowledge base PDFs (gitignored — internal 30X documents)
├── supabase_setup.sql       # Step 1: chunks table + match_chunks RPC
├── supabase_hybrid.sql      # Step 2: FTS column + hybrid_match_chunks RPC
├── supabase_feedback.sql    # Step 3: feedback table + knowledge_gaps view
├── IMPROVEMENTS.md          # Implemented improvements log
├── DEVELOPMENT_LOG.md       # Problems faced during the build and how they were solved
└── README.md
```

> PDFs in `docs/` are in `.gitignore` as they are internal 30X documents. The system works with any set of PDFs placed in that folder and re-indexed.

### Frontend features

- **Grounded chat** with the 5 onboarding questions surfaced as starter prompts (RF-04)
- **Markdown rendering** so the agent's tables and formatting display properly (react-markdown + remark-gfm)
- **Light/dark theme** with the 30X brand identity (next-themes, persisted, no flash)
- **Motion** via GSAP for message and welcome-screen entrance animations (respects `prefers-reduced-motion`)
- **Source attribution with inline citations** — each answer shows its source documents, and clicking a source reveals the exact passage it was grounded in
- **Area-aware onboarding** — new hires pick their area to get tailored starter questions and context
- **First-week checklist** — the real Doc3 first-week plan as an interactive, persisted checklist
- **Human escalation** — when the agent can't answer, a one-click handoff to the Chief of Staff
- **Gap dashboard** (`/gaps`, key-protected) — a living report of questions the agent couldn't answer, so the team knows what to document next

---

## Video walkthrough

[Add Loom/YouTube link here] — ~8 minutes · in Spanish

Covers: architecture decisions, AI-assisted build process, gaps found in the documents, live agent demo.

---

## Author

**Sebastián Vela** — [@sebastianvelace](https://github.com/sebastianvelace)

Electronic Engineering student, Universidad Nacional de Colombia · AI Engineer in training · Bogotá, Colombia
# agent-30x
