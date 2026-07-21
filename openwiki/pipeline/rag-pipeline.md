---
type: Pipeline
title: RAG Pipeline
description: Python RAG pipeline for Evo Notes. Covers LightRAG per-workspace isolation, document parsing backends (Modal GPU MineRU, MinerU Lite, direct insert), embedding/LLM model providers, ingest worker flow, and B2 blob storage.
tags: [pipeline, rag, lightrag, parsing, python]
---

# RAG Pipeline

The Python pipeline handles document ingestion (parsing, embedding, graph building) and AI retrieval/generation (chat, generate). It is built on LightRAG v1.5 with per-workspace isolation. A single Docker image serves as both the ingest worker and the retrieval service.

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Python Pipeline (single image, two roles)       │
│                                                  │
│  ┌─ Worker (asyncio) ──────────────────────┐    │
│  │ 1. Claim job (FOR UPDATE SKIP LOCKED)    │    │
│  │ 2. Download source from B2               │    │
│  │ 3. Parse (Modal/MinerU Lite/direct)      │    │
│  │ 4. LightRAG ainsert                      │    │
│  │ 5. Publish progress to Redis             │    │
│  │ 6. Set files.doc_id + status='ready'     │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌─ Retrieval (FastAPI :8001) ─────────────┐    │
│  │ Per-workspace LightRAG aquery            │    │
│  │ Streaming SSE responses                  │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
         │                    │
    ┌────▼────┐         ┌────▼─────┐
    │ Modal   │         │ MinerU   │
    │ GPU     │         │ Lite API │
    │ MineRU  │         │ (free)   │
    └─────────┘         └──────────┘
```

## LightRAG Configuration

**Source**: `pipeline/pipeline/config.py`, `pipeline/pipeline/rag/factory.py`

### Per-Workspace Isolation

Each workspace gets its own LightRAG instance with isolated storage:

- **PGKVStorage** — Key-value store with `workspace` column
- **PGVectorStorage** — Vector embeddings with `workspace` column
- **PGGraphStorage** — Apache AGE graph with per-workspace graph name
- **PGDocStatusStorage** — Document ingestion status with `workspace` column

### Ingest vs Query Instances

- **Ingest** (`build_ingest_rag`): Fixed cheap extraction model (`deepseek-v4-flash`), LLM cache enabled, VLM enabled for multimodal analysis
- **Query** (`build_query_rag`): Per-request model dispatch (`deepseek-v4-pro` default, `deepseek-v4-flash` alt), LLM cache **disabled** (so model switch doesn't serve cached answers from the other model)
- Both share the identical embedding function/dimension (mandatory since they read/write the same vector store)

### Vector Index

Uses `HNSW_HALFVEC` index type because the embedding dimension (2560 for Qwen3-Embedding-4B) exceeds pgvector's 2000-dim cap for plain `vector` HNSW indexes. Halfvec supports up to 4000 dims (requires pgvector >= 0.7.0).

## Model Providers

**Source**: `pipeline/pipeline/config.py`

| Role | Provider | Model |
|------|----------|-------|
| Embeddings | OpenRouter | `qwen/qwen3-embedding-4b` (2560 dims, 8192 max tokens) |
| Text LLM (ingest) | DeepSeek | `deepseek-v4-flash` (cheap) |
| Text LLM (query) | DeepSeek | `deepseek-v4-pro` (default) / `deepseek-v4-flash` |
| Vision (VLM) | Google Gemini | `gemini-3.1-flash-lite-preview` (image/table/equation analysis) |
| Speech-to-Text | OpenAI Whisper | `whisper-1` |

All providers use OpenAI-compatible API clients.

## Document Parsing Backends

Three parsing paths, selected by `parseMode`:

### 1. Direct RAW Insert (txt/md)

Plain text and markdown files are inserted directly as RAW text via LightRAG's `ainsert` — no parsing needed.

### 2. MinerU Lite (parseMode=`normal`)

**Source**: `pipeline/pipeline/rag/mineru_lite.py`

- Free, no-auth API at `mineru.net` (IP rate-limited, HTTP 429 throttling)
- Limits: ≤10 MB, ≤20 pages
- Flow: create task → upload bytes to signed OSS URL → poll until done/failed → download markdown
- OCR language pack `ch` covers Chinese + English
- Can optionally relay through a Cloudflare Worker (when `MINERU_RELAY_URL` is set) to stream B2 bytes directly to MinerU's upload endpoint

### 3. Modal GPU MineRU (parseMode=`advanced`, default)

**Source**: `pipeline/pipeline/rag/modal_parser.py`, `modal/mineru_app.py`

Custom LightRAG parser engine registered as `"modal"`. The flow:

1. POST source metadata (presigned B2 download URL + presigned B2 upload URL for artifact) to Modal's `/file_parse` endpoint
2. **Artifact caching**: if a parsed bundle already exists in B2 (keyed by source fingerprint + parse method + parser version), returns cache hit without re-parsing
3. Materializes the Modal response (content_list, images, markdown) as a raw bundle on disk
4. LightRAG's `MinerUIRBuilder` processes headings, tables, equations, images, and page/bbox positions

Supported file types: PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, images (PNG, JPG, JPEG, JP2, WEBP, GIF, BMP).

### Modal App Design

**Source**: `modal/mineru_app.py`

Serverless GPU document parsing with scale-to-zero economics:

- **Cold-start strategy**: Models load once per container via `@modal.enter`; GPU memory snapshots checkpoint the process after model loading so cold boots restore into a ready-to-serve state
- **Model caching**: Weights cached on a Modal Volume (`evo-mineru-models`)
- **Backend**: `hybrid-engine` — MineRU2.5 VLM for layout/tables/formulas + native multilingual OCR
- **Deploy**: `modal deploy modal/mineru_app.py` + one-time `modal run modal/mineru_app.py::download_models`
- **Contract**: `POST /file_parse` with multipart file + `parse_method` + Bearer token → `{content_list, images, md}`

## Cloudflare Worker — MinerU Relay

**Source**: `cloudflare/mineru-relay/src/index.js`, `cloudflare/mineru-relay/wrangler.jsonc`

A serverless proxy that streams a B2 source object directly into MinerU Lite's OSS upload endpoint, avoiding downloading the file to the ingest worker first.

- Validates source URL (must be HTTPS on B2 host) and destination URL (must be on MinerU upload hosts allowlist)
- Max size: 10 MB, relay timeout: 120s
- Authenticated via `RELAY_TOKEN` (constant-time SHA-256 comparison)

## Ingest Worker

**Source**: `pipeline/pipeline/ingest/worker.py`

- Claims jobs from Postgres queue using `FOR UPDATE SKIP LOCKED` (atomic, multi-worker-safe)
- Runs on a single asyncio event loop so cached LightRAG asyncpg connection pools survive across jobs
- Synchronous operations (psycopg queue ops, B2 blob staging) pushed to threads via `asyncio.to_thread`
- Publishes live progress to Redis (worker → server → SSE to browser)
- Progress stages: PENDING=20%, PARSING=35%, ANALYZING=60%, PROCESSING=80%
- Persists LightRAG doc ID on `files.doc_id` for future deletion or scoped-retrieval

Entry point: `evo-worker = "pipeline.ingest.worker:main"` (in `pyproject.toml`)

## DB Store & Blob Storage

**Source**: `pipeline/pipeline/store/db.py`, `pipeline/pipeline/store/blobstore.py`

### DB Store
Thin psycopg helpers over the shared Postgres job queue. Only queue/file/notification plumbing lives here; all actual RAG state is owned by LightRAG's own `lightrag_*` tables.

Key functions: `claim_job`, `set_job`, `set_file_status`, `set_file_doc_id`, `set_file_parse_artifact`.

### B2 Blob Storage
B2 client using boto3 (S3-compatible API):

- `fetch_local(blob_path)` — downloads to temp file, returns `(local_path, cleanup)`
- `presign_get` / `presign_put` — presigned URLs for Modal and MinerU Lite
- `object_info` — head_object for cache checking
- `download_to` / `delete` — direct download and deletion
- Lazily initialized (boto3 imported on first use)

## Python Dependencies

**Source**: `pipeline/pyproject.toml`

| Dependency | Purpose |
|-----------|---------|
| `lightrag-hku>=1.5.4,<1.6` | LightRAG with Postgres/AGE/pgvector storages |
| `asyncpg>=0.29` | LightRAG PG storages (async) |
| `pgvector>=0.3` | pgvector.asyncpg registration |
| `psycopg[binary]>=3.1` | Job queue + notifications |
| `openai>=1.30` | OpenAI-compatible model provider client |
| `boto3>=1.34` | Backblaze B2 source-object downloads |
| `fastapi>=0.110`, `uvicorn[standard]` | Retrieval HTTP service |
| `redis>=5.0` | Progress pub/sub |
| `requests>=2.31` | Modal parse client + MinerU Lite API |
| `vcrpy>=6.0` (test) | Records HTTP calls to YAML cassettes for deterministic test replay |

## Source References

| Component | Source File |
|-----------|-------------|
| Config | `pipeline/pipeline/config.py` |
| RAG factory | `pipeline/pipeline/rag/factory.py` |
| Modal parser | `pipeline/pipeline/rag/modal_parser.py` |
| MinerU Lite | `pipeline/pipeline/rag/mineru_lite.py` |
| Ingest worker | `pipeline/pipeline/ingest/worker.py` |
| DB store | `pipeline/pipeline/store/db.py` |
| B2 store | `pipeline/pipeline/store/blobstore.py` |
| Modal app | `modal/mineru_app.py` |
| CF worker | `cloudflare/mineru-relay/src/index.js` |
| Python deps | `pipeline/pyproject.toml` |
| Dockerfile | `pipeline/Dockerfile` |

The gateway calls the retrieval service via its [pipeline client](../backend/api-and-auth.md#pipeline-integration). See [Deployment & Operations](../operations/deployment.md) for the full Docker stack.
