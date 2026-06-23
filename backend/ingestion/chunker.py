import tiktoken

# Finer chunks improve retrieval granularity and citation precision:
# smaller units surface the exact passage that answers a question rather
# than a broad section that only partially matches.
CHUNK_SIZE = 250
CHUNK_OVERLAP = 30

enc = tiktoken.get_encoding("cl100k_base")


def chunk_text(text: str, source_doc: str) -> list[dict]:
    tokens = enc.encode(text)
    chunks = []
    start = 0

    while start < len(tokens):
        end = min(start + CHUNK_SIZE, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text = enc.decode(chunk_tokens)

        chunks.append({
            "content": chunk_text,
            "source_doc": source_doc,
            "metadata": {
                "chunk_index": len(chunks),
                "token_count": len(chunk_tokens),
            },
        })

        if end == len(tokens):
            break
        start += CHUNK_SIZE - CHUNK_OVERLAP

    return chunks
