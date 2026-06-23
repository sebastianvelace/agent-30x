import os
import hashlib
from functools import lru_cache
import voyageai
from supabase import create_client, Client


@lru_cache(maxsize=1)
def _supabase() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


@lru_cache(maxsize=1)
def _voyage() -> voyageai.Client:
    # Voyage AI requires its own API key (get one at https://dash.voyageai.com)
    return voyageai.Client(api_key=os.environ["VOYAGE_API_KEY"])

BATCH_SIZE = 50


def _content_hash(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def embed_and_store(chunks: list[dict]) -> int:
    stored = 0

    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        texts = [c["content"] for c in batch]

        # voyageai.Client.embed() returns an EmbeddingsObject with .embeddings (list of lists)
        response = _voyage().embed(
            texts,
            model="voyage-3",
            input_type="document",
        )

        rows = []
        for chunk, embedding in zip(batch, response.embeddings):
            rows.append({
                "content": chunk["content"],
                "embedding": embedding,
                "source_doc": chunk["source_doc"],
                "metadata": {
                    **chunk["metadata"],
                    "content_hash": _content_hash(chunk["content"]),
                },
            })

        # Plain insert — duplicates are handled at the script level via --replace/--reset flags.
        # The metadata->>'content_hash' expression is not a column with a unique index,
        # so upsert on_conflict with a JSONB path expression would fail at runtime.
        _supabase().table("chunks").insert(rows).execute()

        stored += len(rows)
        print(f"[ingest] batch {i // BATCH_SIZE + 1}: {len(rows)} chunks stored")

    return stored
