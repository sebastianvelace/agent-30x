# Improvements plan — 8 features

Tracking doc so work can resume across sessions. Each feature ends committed, tested
(mostly mocked — no real API calls except a few end-to-end checks per phase), and documented.

## Locked decisions
- **Escalation contact (#2):** configurable placeholder via `NEXT_PUBLIC_CHIEF_OF_STAFF_EMAIL` (default placeholder, swap for the real one later).
- **Testing:** mock Voyage/Claude in tests (zero cost); only a handful of real calls at the end of each phase to verify production.
- **Gap dashboard (#4):** protected page gated by an admin key (backend endpoint).
- **Area personalization (#8):** explicit area selector on the welcome screen with the real 30X areas.

## Real content (from 30X_Doc3)
- **Areas:** Comercial, Programas, Comunidad, Contenido, Tech/Ops, Talento (RyS).
- **First week:** Día 1 (accesos Notion/Gmail/Circle/WhatsApp, leer los 3 docs, reunión 30 min con líder de área) · Día 2–3 (explorar proyectos activos, leer docs antes de preguntar) · Día 4–5 (primera tarea entregada + documentada, feedback) · Semana 2+ (autonomía, comunicar bloqueos temprano).

## Phases (easy → hard)

### Phase A — Frontend quick wins (no/low API) ✅ DONE
- [x] #7 Friendly error states (cold-start "despertando el agente…", graceful backend errors)
- [x] #8 Area selector on welcome → tailors suggested questions + gives the agent area context
- [x] #2 Human escalation handoff (button on escalated answers → mailto/copy to Chief of Staff)

### Phase B — Grounding & visibility (medium) ✅ DONE
- [x] #5 First-week checklist (interactive, from Doc3, persisted in localStorage)
- [x] #3 Inline citations (backend ChatResponse.citations + frontend passage-on-click)
- [x] #4 Gap dashboard (GET /admin/gaps gated by INGEST_API_KEY + protected /gaps page)

### Phase C — Deep (hard, API-sensitive)
- [skip] #1 Streaming responses — user decided it's not needed for an onboarding tool
- [x] #6 Hybrid retrieval (semantic + Spanish FTS via RRF). Supabase: run supabase_hybrid.sql.
      Re-ingested at 250-token chunks → 14 chunks. Calibrated: entity/keyword queries
      (e.g. HubSpot) now ground via keyword_hit; off-topic and out-of-doc questions still
      escalate (correct per RF-03). Escalation = not(semantic>=floor OR keyword_hit).

## Status log
- (start) Plan created, decisions locked, Doc3 content extracted.
