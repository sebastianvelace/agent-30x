import os
import logging
from fastapi import APIRouter, Depends, HTTPException, Header
from agent.retriever import _supabase

logger = logging.getLogger(__name__)

router = APIRouter()

INGEST_API_KEY = os.environ.get("INGEST_API_KEY", "")


def _verify_admin_key(x_api_key: str = Header(default=None)):
    """Reuse INGEST_API_KEY as the admin gate — no extra env var required."""
    if not INGEST_API_KEY or x_api_key != INGEST_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


@router.get("/admin/gaps", dependencies=[Depends(_verify_admin_key)])
async def get_gaps():
    """
    Return the knowledge_gaps view ordered by times_asked desc.
    Degrades gracefully if the view does not exist yet.
    Gated by X-Api-Key == INGEST_API_KEY (same key as /ingest).
    """
    try:
        result = (
            _supabase()
            .from_("knowledge_gaps")
            .select("question, times_asked, times_escalated, thumbs_down, last_asked")
            .order("times_asked", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as exc:
        logger.warning("knowledge_gaps view unavailable: %s", exc)
        return {"available": False, "detail": str(exc)}
