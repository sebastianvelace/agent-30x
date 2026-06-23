import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from ingestion.parser import extract_text
from ingestion.chunker import chunk_text
from ingestion.embedder import embed_and_store
import tempfile

router = APIRouter()

INGEST_API_KEY = os.environ.get("INGEST_API_KEY", "")


def verify_key(x_api_key: str = Header(...)):
    if x_api_key != INGEST_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


@router.post("/ingest")
async def ingest(
    file: UploadFile = File(...),
    x_api_key: str = Header(...),
):
    if x_api_key != INGEST_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    contents = await file.read()

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    text = extract_text(tmp_path)
    chunks = chunk_text(text, source_doc=file.filename)
    stored = embed_and_store(chunks)

    os.unlink(tmp_path)

    return {
        "filename": file.filename,
        "chunks_stored": stored,
        "status": "ok",
    }
