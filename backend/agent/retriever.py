import os
from functools import lru_cache
from supabase import create_client, Client
import anthropic


@lru_cache(maxsize=1)
def _supabase() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


@lru_cache(maxsize=1)
def _voyage() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def embed_query(text: str) -> list[float]:
    response = _voyage().embeddings.create(
        model="voyage-3",
        input=[text],
        input_type="query",
    )
    return response.data[0].embedding


def retrieve_chunks(query: str) -> list[dict]:
    threshold = float(os.getenv("SIMILARITY_THRESHOLD", "0.75"))
    top_k = int(os.getenv("TOP_K_CHUNKS", "5"))

    embedding = embed_query(query)

    result = _supabase().rpc(
        "match_chunks",
        {
            "query_embedding": embedding,
            "match_threshold": threshold,
            "match_count": top_k,
        },
    ).execute()

    return result.data or []


def build_context(chunks: list[dict]) -> tuple[str, list[str]]:
    if not chunks:
        return "", []

    context_parts = []
    sources: list[str] = []

    for chunk in chunks:
        context_parts.append(
            f"[Source: {chunk['source_doc']} | Relevance: {chunk['similarity']:.2f}]\n{chunk['content']}"
        )
        if chunk["source_doc"] not in sources:
            sources.append(chunk["source_doc"])

    return "\n\n---\n\n".join(context_parts), sources
