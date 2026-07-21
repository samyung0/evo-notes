---
type: Architecture
title: Architecture Overview
description: System architecture for Evo Notes. Covers the full stack topology, service boundaries, request/data flow, and key design decisions.
tags: [architecture, overview]
---

# Architecture Overview

Evo Notes is a three-tier study workspace application: a React SPA, a Go HTTP gateway, and a Python RAG pipeline. All services share a single PostgreSQL database (with pgvector + Apache AGE extensions) and communicate through Redis pub/sub for real-time progress.

## Service Topology

```
┌──────────────────┐
│   Browser (SPA)  │
│  React + Plate   │
└────────┬─────────┘
         │ /api (Vite proxy)
         ▼
┌──────────────────┐          ┌────────────────┐
│  Go Gateway      │─────────▶│  PostgreSQL 16 │
│  (chi + Huma)    │          │  pgvector+AGE  │
│  :8080           │          └────────────────┘
└──┬────┬────┬─────┘
   │    │    │
   │    │    ├───▶ Backblaze B2 (blob storage, presigned URLs)
   │    │
   │    ├───▶ Redis 7 (ingest progress pub/sub)
   │
   └───▶ Python Retrieval Service (FastAPI :8001)
              │
              ▼
         LightRAG (per-workspace)
         ├─ PGKVStorage
         ├─ PGVectorStorage
         ├─ PGGraphStorage (Apache AGE)
         └─ PGDocStatusStorage

┌──────────────────┐
│ Python Worker    │──▶ Modal GPU (MineRU parsing)
│ (asyncio loop)   │──▶ MinerU Lite API (free parsing)
│                  │──▶ B2 (source download, artifact cache)
└──────────────────┘
```

## Service Responsibilities

### Frontend (React SPA)

- **Role**: User interface, real-time editor, study modes.
- **Stack**: React 19, Vite, TanStack Router, TanStack Query, Plate.js v53, Tailwind CSS 4, Zustand.
- **Auth**: Clerk (frontend SDK). In dev, MSW mocks all API calls.
- **Key flow**: Bootstrap → AuthProvider → AppShell → Router → route component (e.g., WorkspaceOpen) → API hooks (TanStack Query) → render.
- **API contract**: Generated from the Go server's OpenAPI spec via orval → TypeScript types + Zod validators + TanStack Query hooks. See [Frontend Editor & UI](../frontend/editor-and-ui.md).

### Go Gateway

- **Role**: HTTP API, auth, authorization, blob upload orchestration, pipeline proxy, billing, webhooks.
- **Stack**: Go 1.25, chi v5 router, Huma v2 (OpenAPI-first), pgx/v5, Backblaze B2 SDK (AWS SDK Go v2).
- **Key flow**: Request → CORS → Auth middleware → Huma handler (CRUD) or raw chi handler (streaming/multipart/webhooks) → store query → JSON response.
- **Migrations**: Embedded SQL migrations applied on startup (`MIGRATE=true` by default).
- **Design**: Hybrid router — Huma owns JSON CRUD (auto OpenAPI spec), raw chi handles SSE streaming, multipart uploads, blob redirects, webhooks, and pipeline passthrough. See [Backend API & Auth](../backend/api-and-auth.md).

### Python Pipeline (Worker + Retrieval)

- **Role**: Document ingestion (parsing, embedding, graph building) and AI retrieval/generation (chat, generate).
- **Stack**: Python 3.11, LightRAG v1.5, FastAPI (retrieval), asyncio worker (ingest), psycopg (job queue), asyncpg (LightRAG storages), boto3 (B2).
- **Key flow (ingest)**: Worker claims job via `FOR UPDATE SKIP LOCKED` → downloads source from B2 → parses (Modal/MinerU Lite/direct) → LightRAG `ainsert` → publishes progress to Redis → sets `files.doc_id`.
- **Key flow (retrieval)**: Go gateway → HTTP POST to FastAPI → per-workspace LightRAG `aquery` → streamed response back through gateway SSE to browser.
- **Model providers**: DeepSeek (text LLM), OpenRouter/Qwen (embeddings), Gemini (vision), Whisper (STT). See [RAG Pipeline](../pipeline/rag-pipeline.md).

### PostgreSQL

- **Role**: Shared data store for all services. Gateway owns business tables; LightRAG owns `lightrag_*` tables in the same database.
- **Extensions**: pgvector (vector embeddings, HNSW_HALFVEC index), Apache AGE (graph storage for LightRAG).
- **Per-workspace isolation**: LightRAG storages add a `workspace` column; AGE graph names are derived per workspace.

### Redis

- **Role**: Pub/sub bus for ingest progress events. Worker publishes progress → gateway subscribes → fans out via SSE to the browser.

### Backblaze B2

- **Role**: Cloud object storage for uploaded source files, parsed artifacts, and editor assets. Uses presigned URLs so file downloads never proxy through the gateway.

## Request Flow Examples

### File Upload + Ingest

1. Browser `POST /api/workspaces/{id}/sources` (multipart) → Go gateway
2. Gateway stores bytes in B2 (presigned upload)
3. If `parseMode != "none"`: creates file row (status=`processing`) + enqueues ingest job
4. Worker claims job → downloads from B2 → parses via Modal or MinerU Lite → LightRAG `ainsert`
5. Worker publishes progress to Redis → gateway SSE → browser updates UI
6. Worker sets `files.doc_id` and `status='ready'`

### AI Chat (Streaming)

1. Browser `POST /api/workspaces/{id}/chat/stream` → Go gateway
2. Gateway forwards to Python retrieval service (`PostStream`)
3. Retrieval service runs LightRAG `aquery` with per-workspace context
4. Response tokens stream back through gateway as SSE → browser renders incrementally

### Collaborative Editing

1. Browser editor (Plate.js) → `PATCH /api/materials/{id}` with `ExpectedRevision`
2. Gateway checks effective access via `MaterialEffectiveAccess` (see [Backend API & Auth](../backend/api-and-auth.md))
3. Shared (non-explicit) editors can only replace versioned content; metadata/filing/deletion require explicit membership
4. Gateway increments `revision` and creates `MaterialRevision` row
5. Suggestions/discussions/comments flow through dedicated collaboration endpoints

## Key Design Decisions

- **OpenAPI-first**: The Go server generates the API spec; the frontend generates types from it. This enforces contract parity. (See `orval.config.ts`, `server/cmd/openapi/main.go`)
- **Universal Material Envelope**: Migration `0010` consolidated quizzes, flashcards, mindmaps, and diagrams into a single `materials` table with a Plate document as content. Legacy tables were backfilled and dropped. See [Data Model](data-model.md).
- **Per-workspace LightRAG**: Each workspace gets isolated vector storage, graph, and KV storage within the same Postgres database.
- **Security through obscurity**: `ErrForbidden` is mapped to `ErrNotFound` for shared resources, preventing information leakage about resource existence.
- **Lazy user provisioning**: On first Clerk-authenticated request, the middleware creates the user record and a default workspace.

## Source References

| Component | Key Source Files |
|-----------|-----------------|
| Go entrypoint | `server/cmd/api/main.go` |
| Go router/middleware | `server/internal/httpapi/server.go` |
| Go auth | `server/internal/auth/middleware.go` |
| Go data models | `server/internal/store/models.go` |
| Frontend entry | `src/main.tsx` |
| Frontend routing | `src/router.tsx` |
| Pipeline config | `pipeline/pipeline/config.py` |
| Pipeline worker | `pipeline/pipeline/ingest/worker.py` |
| Docker stack | `deploy/docker-compose.yml` |
