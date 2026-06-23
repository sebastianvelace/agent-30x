import os
import hashlib
from functools import lru_cache
import anthropic
from supabase import create_client, Client


@lru_cache(maxsize=1)
def _supabase() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


@lru_cache(maxsize=1)
def _voyage() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

BATCH_SIZE = 50


def _content_hash(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def embed_and_store(chunks: list[dict]) -> int:
    stored = 0

    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        texts = [c["content"] for c in batch]

        response = _voyage().embeddings.create(
            model="voyage-3",
            input=texts,
            input_type="document",
        )

        rows = []
        for chunk, emb in zip(batch, response.data):
            rows.append({
                "content": chunk["content"],
                "embedding": emb.embedding,
                "source_doc": chunk["source_doc"],
                "metadata": {
                    **chunk["metadata"],
                    "content_hash": _content_hash(chunk["content"]),
                },
            })

        _supabase().table("chunks").upsert(
            rows,
            on_conflict="source_doc,metadata->>content_hash",
        ).execute()

        stored += len(rows)
        print(f"[ingest] batch {i // BATCH_SIZE + 1}: {len(rows)} chunks stored")

    return stored
