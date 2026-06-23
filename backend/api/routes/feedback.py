import logging
from fastapi import APIRouter
from api.models import FeedbackRequest, FeedbackResponse
from agent.retriever import _supabase

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/feedback", response_model=FeedbackResponse)
async def feedback(request: FeedbackRequest) -> FeedbackResponse:
    """
    Log user feedback to the Supabase `feedback` table.

    Degrades gracefully: if the table does not exist yet (or any insert error
    occurs), returns status='skipped' with HTTP 200 so the frontend never
    breaks on missing infrastructure.
    """
    try:
        _supabase().table("feedback").insert(
            {
                "question": request.question,
                "rating": request.rating,
                "escalated": request.escalated,
                "sources": request.sources,
            }
        ).execute()
        return FeedbackResponse(status="ok")
    except Exception as exc:
        logger.warning("Feedback insert skipped — table may not exist yet: %s", exc)
        return FeedbackResponse(status="skipped")
