"""Runtime configuration, all from env so the same image runs as worker,
retrieval service, or benchmark CLI."""
from __future__ import annotations

import os

# Embedding dimension. Must match vector(N) in server/migrations/0003_rag.sql.
EMBED_DIM = 384


class Config:
    # Postgres (shared with the Go gateway). psycopg accepts the postgres:// URL.
    dsn: str = os.getenv("DATABASE_URL", "postgres://evo:evo@localhost:5432/evo?sslmode=disable")

    # Shared blob volume — the gateway writes uploads here, the worker reads them.
    blob_dir: str = os.getenv("BLOB_DIR", "./data/blobs")

    # Pinned pair at deploy; the worker honours the job payload but falls back
    # to these (and ultimately to 'simple') when a backend isn't installed.
    parser: str = os.getenv("EVO_PARSER", "simple")     # simple | docling | mineru
    engine: str = os.getenv("EVO_ENGINE", "linearrag")  # linearrag | lightrag | dense

    # Embeddings: 'hash' is a dependency-free dev default; 'st' uses
    # sentence-transformers (install the `embed` extra).
    embedder: str = os.getenv("EVO_EMBEDDER", "hash")
    st_model: str = os.getenv("EVO_ST_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

    # LLM (Anthropic Claude by default). Empty key → extractive fallbacks.
    anthropic_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    llm_model: str = os.getenv("EVO_LLM_MODEL", "claude-haiku-4-5-20251001")
    vlm_model: str = os.getenv("EVO_VLM_MODEL", "claude-haiku-4-5-20251001")

    # Worker poll cadence (seconds) for the Postgres job queue.
    poll_interval: float = float(os.getenv("EVO_POLL_INTERVAL", "2.0"))

    # Passage chunking target (characters).
    chunk_chars: int = int(os.getenv("EVO_CHUNK_CHARS", "900"))


cfg = Config()
