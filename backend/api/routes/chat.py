from fastapi import APIRouter
from api.models import ChatRequest, ChatResponse
from agent.llm import chat as agent_chat

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    result = agent_chat(request.message, request.history)
    return ChatResponse(**result)
