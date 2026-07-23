---
type: Pipeline
title: "Pipeline: RAG"
description: Python RAG pipeline for evo-notes — LightRAG factory, ingest worker, retrieval FastAPI service, Modal GPU document parsing, MinerU Lite cloud, Cloudflare relay, workspace clone, and Plate AI adapter.
tags: [pipeline, python, rag, lightrag, modal, document-parsing]
---

# Pipeline: RAG

The Python pipeline (`pipeline/`) provides document ingestion and RAG retrieval for evo-notes. It runs as two services from the same Docker image: a **retrieval service** (FastAPI) and an **ingest worker** (asyncio loop). Both share the same Postgres instance as the Go [backend](../backend/api-and-store.md).

## Configuration — `pipeline/pipeline/config.py`

A frozen `Config` dataclass reads all settings from environment variables (single `cfg` singleton). Key groups:

| Concern | Env Vars |
|---------|----------|
| Shared infra | `DATABASE_URL`, `REDIS_URL`, `WORKING_DIR` (`/data/rag_storage`) |
| B2 blob storage | `B2_ENDPOINT`, `B2_BUCKET`, `B2_KEY_ID`, `B2_APP_KEY` |
| Modal GPU | `MODAL_PARSE_URL`, `MODAL_PARSE_TOKEN`, `MODAL_PARSE_TIMEOUT` (600s), `EVO_PARSE_METHOD` (auto/ocr/txt) |
| MinerU Lite | `MINERU_LITE_BASE_URL`, `MINERU_RELAY_URL/TOKEN` (Cloudflare relay) |
| Embeddings | OpenRouter `qwen/qwen3-embedding-4b`, dim 2560 |
| Text LLM | DeepSeek (`deepseek-v4-flash` for ingest, `deepseek-v4-pro`/`flash` for query) |
| Vision (VLM) | Gemini `gemini-3.1-flash-lite-preview` via OpenAI-compatible endpoint |
| Speech-to-text | Whisper-compatible STT |

A helper `_seed_lightrag_pg_env()` parses `DATABASE_URL` into discrete `POSTGRES_*` vars that LightRAG's PG storages read, and pins `POSTGRES_VECTOR_INDEX_TYPE=HNSW_HALFVEC` (2560-dim embeddings exceed pgvector's 2000-dim plain-vector cap).

## LightRAG Factory — `pipeline/pipeline/rag/factory.py`

Builds per-workspace `LightRAG` instances over shared Postgres + AGE + pgvector. All four PG storages (KV/vector/graph/doc-status) are isolated per tenant via LightRAG's `workspace` parameter.

- `build_ingest_rag()` — Fixed flash model, LLM cache on, VLM role for multimodal analysis
- `build_query_rag()` — Pro/flash per-request dispatch via contextvar, LLM cache off
- Registers the custom `modal` parser engine on import

### RagCache — `rag/cache.py`
Workspace-keyed LRU cache (default 16 slots) of `LightRAG` instances. Keeps asyncpg pools alive across requests without holding a connection per tenant. Eviction finalizes instance storages. Must live on a single long-lived event loop.

## Ingest Worker — `pipeline/pipeline/ingest/worker.py`

Long-running asyncio worker (`python -m pipeline.ingest.worker`). Polls Postgres job queue every 2s (`FOR UPDATE SKIP LOCKED`). Three parse modes:

| Mode | Flow |
|------|------|
| **Text** (txt/md) | Download B2 blob → read text → `rag.ainsert()` as RAW text |
| **`normal`** | MinerU Lite cloud API (free, via Cloudflare relay if configured) → markdown → `rag.ainsert()` |
| **`advanced`** (default) | Stage source → `rag.apipeline_enqueue_documents(parse_engine="modal")` → Modal GPU MineRU parses → LightRAG builds IR → multimodal i/t/e analysis (Gemini VLM) |

Publishes live progress to Redis (`ingest:{workspaceId}` channel) — the Go gateway fans out to browser via SSE. Records `files.doc_id` to map files ↔ LightRAG documents. Handles duplicate detection (post-parse content duplicates and enqueue-time duplicates). Synchronous ops (psycopg, blob staging) pushed to threads via `asyncio.to_thread`.

## Retrieval Service — `pipeline/pipeline/retrieve/service.py`

FastAPI app (port 8001). The Go gateway proxies these endpoints:

| Endpoint | Purpose |
|----------|---------|
| `POST /chat` | Non-streaming RAG query via `LightRAG.aquery(mode="mix")` |
| `POST /chat/stream` | SSE streaming grounded answer: `citations` → `token*` → `done` |
| `POST /generate` | AI content generation: flashcards (JSON), quizzes (cognitive levels), mindmaps (Mermaid), diagrams (Mermaid), summaries |
| `POST /complete/stream` | Non-RAG LLM completion for note editor: "command" and "continue" modes |
| `POST /workspace/clone` | Copies one workspace's LightRAG state (PG rows + AGE graph) to another |
| `POST /transcribe` | Audio transcription via Whisper-compatible STT |

A singleton `RagCache` lives on the FastAPI event loop. Per-request model override via contextvar.

### Workspace Clone — `rag/clone.py`
`clone_workspace_state()` copies parsed LightRAG state via `INSERT … SELECT` per lightrag table (rewriting workspace column) + row-level copy of AGE label tables. Skips the LLM response cache.

## Modal GPU Parser — `modal/mineru_app.py`

Serverless GPU document parsing service. App name: `evo-mineru`.

**Why Modal**: MineRU needs a GPU but ingest is bursty → scale-to-zero is cheaper than always-on pod.

- **Image**: Debian slim + Python 3.11, `mineru[all]>=3.4.3,<3.5` (hybrid: MinerU2.5 VLM + native multilingual OCR), vLLM
- **GPU**: L4, 24GB VRAM, one input per container
- **Cold-start mitigation**: Three layers — (1) models load via `@modal.enter(snap=True)` using MineRU's `aio_do_parse` + `ModelSingleton`, (2) GPU memory snapshots checkpoint after model load, (3) `scaledown_window=60` keeps container alive ~5 min after last request
- **`/file_parse` endpoint**: Two modes — JSON (B2 artifact path: receives `source_url` + `output_url`, fetches from B2, parses, uploads ZIP artifact back) or multipart (legacy: receives file bytes directly)
- Returns `_server_parse_s` (parse-only time) and `_uptime_s` (time since snapshot restore) for cold-boot diagnostics

## Modal Parser Engine — `pipeline/pipeline/rag/modal_parser.py`

Custom LightRAG parser engine (`engine="modal"`) registered via `ExternalParserBase`. POSTs source files to Modal's `/file_parse` endpoint.

Two paths:
1. **B2 artifact path** — Stages a JSON descriptor, presigns B2 GET/PUT URLs, sends to Modal which fetches source from B2 and uploads parsed ZIP artifact back. Caches artifacts by source fingerprint (SHA-256).
2. **Legacy path** — Multipart file upload directly.

Downloads/validates the ZIP artifact (manifest.json + content_list.json + images/), materializes a MinerU-style raw bundle on disk so LightRAG's built-in `MinerUIRBuilder` can produce headings, tables, equations, images with page/bbox positions.

## MinerU Lite — `pipeline/pipeline/rag/mineru_lite.py`

Client for the free, token-free MinerU "Agent lightweight" cloud API (mineru.net). Used for `parseMode=normal`. Flow: create task → upload to signed OSS URL → poll until done → download markdown.

Supports an optional Cloudflare relay path (`parse_blob`) that streams B2 → MinerU's OSS upload URL without source bytes touching the Python worker. IP rate-limited (429), ≤10 MB, ≤20 pages.

## Cloudflare Worker — `cloudflare/mineru-relay/`

Streams a private Backblaze B2 source object directly into MinerU's signed OSS upload URL without the source bytes touching the Python worker. Used for `parseMode=normal`.

- **Auth**: `RELAY_TOKEN` bearer (constant-time comparison)
- **Validation**: POST only, source must be `B2_HOST`, destination must be in `MINERU_UPLOAD_HOSTS`, HTTPS only, ≤10 MiB
- **Flow**: `fetch(source) → fetch(destination, PUT, body: sourceResponse.body)` with 120s timeout
- **Config**: Worker name `evo-mineru-relay`; `B2_HOST=s3.eu-central-003.backblazeb2.com`, `MINERU_UPLOAD_HOSTS=oss-mineru.openxlab.org.cn`

## Plate AI Adapter — `pipeline/pipeline/retrieve/ai_adapter.py`

Plate editor AI adapter under `/plate-ai` prefix. Translates Plate/@ai-sdk request shapes into server-owned provider calls (no browser-supplied credentials — both come from `pipeline.config`). Validates/bounds all inputs (max context chars, instruction chars, history chars, output tokens). Supports `generate`, `edit`, `comment` tool modes.

## Store — `pipeline/pipeline/store/`

| File | Purpose |
|------|---------|
| `db.py` | Thin psycopg helpers: job queue (`claim_job` via `FOR UPDATE SKIP LOCKED`), `set_job`, `set_file_status`, `set_file_doc_id`, `add_notification` |
| `blobstore.py` | B2 object operations via boto3: `fetch_local()`, `presign_get/put`, `object_info`, `download_to`, `delete` |

## Progress Publishing — `rag/progress.py`

Redis progress publisher. Publishes JSON events to `ingest:{workspaceId}` channel; the Go gateway subscribes and fans out to browser via SSE. Best-effort, fire-and-forget.
