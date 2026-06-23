"""
CLI ingestion script.

Usage:
  python -m scripts.ingest --docs-path ../docs/
  python -m scripts.ingest --docs-path ../docs/ --file 30X_Doc1_Organizacion.pdf
  python -m scripts.ingest --docs-path ../docs/ --replace 30X_Doc1_Organizacion.pdf
  python -m scripts.ingest --docs-path ../docs/ --reset
"""
import argparse
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, str(Path(__file__).parent.parent))

from ingestion.parser import extract_text
from ingestion.chunker import chunk_text
from ingestion.embedder import embed_and_store, _supabase


def ingest_file(pdf_path: Path) -> int:
    print(f"[ingest] Processing: {pdf_path.name}")
    text = extract_text(str(pdf_path))
    chunks = chunk_text(text, source_doc=pdf_path.name)
    print(f"[ingest]   → {len(chunks)} chunks generated")
    stored = embed_and_store(chunks)
    print(f"[ingest]   → {stored} chunks stored in Supabase")
    return stored


def delete_doc(filename: str) -> None:
    _supabase().table("chunks").delete().eq("source_doc", filename).execute()
    print(f"[ingest] Deleted existing chunks for: {filename}")


def reset_all() -> None:
    _supabase().table("chunks").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print("[ingest] All chunks deleted")


def main():
    parser = argparse.ArgumentParser(description="30X knowledge base ingestion")
    parser.add_argument("--docs-path", required=True, help="Path to the docs folder")
    parser.add_argument("--file", help="Ingest a single file")
    parser.add_argument("--replace", help="Replace a single file (deletes existing chunks first)")
    parser.add_argument("--reset", action="store_true", help="Delete all chunks and re-ingest everything")
    args = parser.parse_args()

    docs_path = Path(args.docs_path)

    if args.reset:
        reset_all()
        pdfs = list(docs_path.glob("*.pdf"))
        for pdf in pdfs:
            ingest_file(pdf)
        print(f"[ingest] ✓ Complete: {len(pdfs)} files re-indexed")
        return

    if args.replace:
        delete_doc(args.replace)
        ingest_file(docs_path / args.replace)
        return

    if args.file:
        ingest_file(docs_path / args.file)
        return

    pdfs = list(docs_path.glob("*.pdf"))
    if not pdfs:
        print(f"[ingest] No PDF files found in {docs_path}")
        return

    total_chunks = 0
    for pdf in pdfs:
        total_chunks += ingest_file(pdf)

    print(f"[ingest] ✓ Ingestion complete: {total_chunks} chunks across {len(pdfs)} files")


if __name__ == "__main__":
    main()
