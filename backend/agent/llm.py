import os
import re
import time
import logging
import threading
from functools import lru_cache
import anthropic
from .retriever import retrieve_chunks, build_context
from .prompts import SYSTEM_PROMPT
from api.models import Message

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _claude() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


# ---------------------------------------------------------------------------
# Query cache — single-instance optimization (Railway free tier: 1 dyno).
# We cache ONLY stateless first-turn questions (empty history) because those
# share no user-specific context and are the dominant repeated case for new
# hires asking the same onboarding questions.
# A dict with TTL is sufficient; no external dependency needed.
# ---------------------------------------------------------------------------

_CACHE_MAX_SIZE = 256       # max entries before eviction
_CACHE_TTL_SECONDS = 3600   # 1 hour

# Each entry: { "result": dict, "expires_at": float }
_query_cache: dict[str, dict] = {}
_cache_lock = threading.Lock()


def _normalize(text: str) -> str:
    """Normalize a query string for cache keying."""
    return re.sub(r"\s+", " ", text.strip().lower())


def _cache_get(key: str) -> dict | None:
    with _cache_lock:
        entry = _query_cache.get(key)
        if entry is None:
            return None
        if time.monotonic() > entry["expires_at"]:
            del _query_cache[key]
            return None
        return entry["result"]


def _cache_set(key: str, result: dict) -> None:
    with _cache_lock:
        # Evict oldest entries when at capacity
        if len(_query_cache) >= _CACHE_MAX_SIZE:
            oldest = min(_query_cache, key=lambda k: _query_cache[k]["expires_at"])
            del _query_cache[oldest]
        _query_cache[key] = {
            "result": result,
            "expires_at": time.monotonic() + _CACHE_TTL_SECONDS,
        }


# ---------------------------------------------------------------------------
# History cap — keep only the last N messages (excluding the current turn).
# This bounds per-request token cost regardless of conversation length.
# 6 messages ≈ 3 full exchanges, enough for short-term context without
# ballooning cost on long sessions.
# ---------------------------------------------------------------------------

_HISTORY_CAP = 6  # number of history messages forwarded to Claude


def chat(message: str, history: list[Message]) -> dict:
    is_stateless = len(history) == 0

    # --- Cache check (stateless questions only) ---
    if is_stateless:
        cache_key = _normalize(message)
        cached = _cache_get(cache_key)
        if cached is not None:
            logger.info("Cache HIT for query: %s", cache_key[:80])
            return cached
        logger.info("Cache MISS for query: %s", cache_key[:80])

    # --- Retrieval ---
    chunks = retrieve_chunks(message)
    context, sources = build_context(chunks)
    escalate = len(chunks) == 0

    system = SYSTEM_PROMPT.format(
        context=context if context else "No relevant information found in the documents for this query."
    )

    # --- History cap ---
    # Slice to the last _HISTORY_CAP messages before appending the current one.
    # This prevents unbounded token growth on long conversations while still
    # giving Claude enough recent context to avoid repeating itself.
    capped_history = history[-_HISTORY_CAP:] if len(history) > _HISTORY_CAP else history
    if len(history) > _HISTORY_CAP:
        logger.info(
            "History capped: %d total messages → sending last %d",
            len(history),
            _HISTORY_CAP,
        )

    messages = [{"role": m.role, "content": m.content} for m in capped_history]
    messages.append({"role": "user", "content": message})

    response = _claude().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        messages=messages,
    )

    result = {
        "response": response.content[0].text,
        "escalate": escalate,
        "sources": sources,
    }

    # --- Cache store (stateless questions only) ---
    if is_stateless:
        _cache_set(cache_key, result)
        logger.info("Cache SET for query: %s", cache_key[:80])

    return result
