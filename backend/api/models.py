from pydantic import BaseModel
from typing import Optional, Literal


class Message(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []


class ChatResponse(BaseModel):
    response: str
    escalate: bool = False
    sources: list[str] = []


class FeedbackRequest(BaseModel):
    question: str
    rating: Optional[Literal["up", "down"]] = None
    escalated: bool = False
    sources: list[str] = []


class FeedbackResponse(BaseModel):
    status: str  # "ok" | "skipped"
