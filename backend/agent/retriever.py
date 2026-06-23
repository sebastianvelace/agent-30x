import os
from functools import lru_cache
from supabase import create_client, Client
import voyageai


@lru_cache(maxsize=1)
def _supabase() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


@lru_cache(maxsize=1)
def _voyage() -> voyageai.Client:
    return voyageai.Client(api_key=os.environ["VOYAGE_API_KEY"])


def embed_query(text: str) -> list[float]:
    # voyageai.Client.embed() returns EmbeddingsObject with .embeddings (list of lists)
    response = _voyage().embed(
        [text],
        model="voyage-3",
        input_type="query",
    )
    return response.embeddings[0]


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
