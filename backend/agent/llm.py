import os
from functools import lru_cache
import anthropic
from .retriever import retrieve_chunks, build_context
from .prompts import SYSTEM_PROMPT
from api.models import Message


@lru_cache(maxsize=1)
def _claude() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.75"))


def chat(message: str, history: list[Message]) -> dict:
    chunks = retrieve_chunks(message)
    context, sources = build_context(chunks)
    escalate = len(chunks) == 0

    system = SYSTEM_PROMPT.format(
        context=context if context else "No relevant information found in the documents for this query."
    )

    messages = [{"role": m.role, "content": m.content} for m in history]
    messages.append({"role": "user", "content": message})

    response = _claude().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        messages=messages,
    )

    return {
        "response": response.content[0].text,
        "escalate": escalate,
        "sources": sources,
    }
