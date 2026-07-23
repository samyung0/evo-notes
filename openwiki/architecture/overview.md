---
type: Architecture
title: Architecture Overview
description: System topology for evo-notes — how the frontend, Go gateway, Python RAG pipeline, Modal GPU parser, Postgres, Redis, B2, Clerk, and Stripe connect and exchange data.
tags: [architecture, topology, data-flow]
---

# Architecture Overview

## System Topology

```
Browser
  │  JWT (Clerk)
  │  /api (REST + SSE)
  ▼
┌─────────────────────────────────────────────┐
│  Go Gateway (:8080)                          │
│  chi router + huma (OpenAPI)                 │
│  ├── auth.Middleware (Clerk JWT / dev / E2E) │
│  ├── huma JSON CRUD (60+ endpoints)         │
│  └── raw chi routes (SSE, multipart, webhooks│
│      pipeline passthrough, blob presign)     │
└──────┬────────┬──────────┬──────────┬────────┘
       │        │          │          │
       ▼        ▼          ▼          ▼
   Postgres   Redis    B2 (S3)   Python Pipeline
   (pgvector  (progress  (blob    (:8001, retrieval)
    + AGE)    pub/sub)   storage)   ├── /chat/stream (SSE)
   ├── users  ▲          ▲          ├── /generate
   ├── files  │          │          ├── /complete/stream
   ├── materials         │          ├── /transcribe
   ├── jobs   │          │          ├── /workspace/clone
   ├── lightrag_*        │          └── /plate-ai/*
   └── AGE graph         │
       │                  │
       ▼                  │
   Ingest Worker ◄────────┘
   (polls jobs every 2s)
       │
       ├── text files → raw ainsert
       ├── parseMode=normal → MinerU Lite (free cloud, via Cloudflare relay)
       └── parseMode=advanced (default) → Modal GPU (L4, MineRU hybrid)
```

## Service Responsibilities

### Go Gateway (`server/`)
A thin HTTP gateway implementing the frontend's `/api` contract. Owns all CRUD against Postgres, presigned B2 upload/download flows, Clerk JWT authentication, Stripe billing, and Clerk/Stripe webhooks. Proxies AI/RAG requests to the Python pipeline with SSE passthrough. See [Backend: API & Store](../backend/api-and-store.md).

### Python Pipeline (`pipeline/`)
Two runtime modes from the same Docker image:
- **Retrieval service** (FastAPI, `:8001`) — Handles chat (SSE streaming), content generation (flashcards/quizzes/mindmaps/diagrams), note AI completion, audio transcription, Plate editor AI adapter, and workspace RAG clone. Each workspace gets an isolated LightRAG instance cached in an LRU.
- **Ingest worker** — Long-running asyncio process polling a Postgres job queue (`FOR UPDATE SKIP LOCKED`). Fetches source files from B2, parses them (text, MinerU Lite, or Modal GPU), and inserts them into LightRAG. Publishes progress to Redis. See [Pipeline: RAG](../pipeline/rag-pipeline.md).

### Modal GPU App (`modal/`)
Serverless GPU document parsing using MineRU (MinerU2.5 VLM + multilingual OCR). Scale-to-zero for cost efficiency; cold-start mitigated by GPU memory snapshots. Receives source from B2, returns a parsed ZIP artifact back to B2. See [Pipeline: RAG](../pipeline/rag-pipeline.md).

### Cloudflare Worker (`cloudflare/mineru-relay/`)
Streams private B2 objects directly to MinerU's signed OSS upload URL for the "normal" parse mode, avoiding double bandwidth through the Python worker. Token-authenticated, host-validated, 10 MiB cap. See [Pipeline: RAG](../pipeline/rag-pipeline.md).

### React Frontend (`src/`)
SPA with TanStack Router, TanStack Query, Plate.js editor, and a Radix UI + Tailwind design system. MSW mocks enabled by default in dev; disabling proxies to the Go gateway. See [Frontend: Editor & UI](../frontend/editor-and-ui.md).

## Data Flow

### Document Ingestion
1. User uploads a file → Go gateway creates a `files` row (`status=processing`) + enqueues a job in one transaction
2. Go gateway returns presigned B2 PUT URL → browser uploads directly to B2
3. Ingest worker claims the job, fetches the file from B2
4. Parser runs (text / MinerU Lite / Modal GPU depending on `parseMode`)
5. Parsed content inserted into LightRAG → pgvector (embeddings) + Apache AGE (knowledge graph)
6. Worker publishes progress stages to Redis (`ingest:{workspaceId}` channel)
7. Go gateway subscribes to Redis, fans out progress to browser via SSE (`/api/workspaces/{id}/ingest-events`)
8. Worker updates `files.status=ready` + `files.doc_id` in Postgres

### AI Chat (RAG)
1. Frontend sends `POST /api/workspaces/{id}/chat/stream` with query
2. Go gateway proxies to pipeline `POST /chat/stream`
3. Pipeline loads (or creates) a cached LightRAG instance for the workspace
4. LightRAG performs `aquery(mode="mix")` — hybrid local + global retrieval over the knowledge graph
5. Response streamed as SSE: `start` → `citations` → `token*` → `done`
6. Citations reference source files by ID/name/snippet

### Note Editor AI Completion
1. User triggers inline AI (slash menu or selection)
2. Plate's AI plugin sends request through `plateAiTransport` → Go gateway → pipeline `/complete/stream`
3. Pipeline runs a non-RAG LLM completion (command or continue mode)
4. Tokens stream back as SSE, inserted into the editor live

### Material Save (Optimistic Concurrency)
1. Frontend debounces save (5s) with `expectedRevision`
2. Go gateway validates the Plate document via `materialdoc.Validate`
3. Store checks revision match — on conflict returns `409`
4. On success, stores new `Material` content + creates a `MaterialRevision` history entry
5. Frontend reconciles or shows error state

## Shared Infrastructure

### Postgres
Single instance serves three roles:
- **Application data** — users, workspaces, chapters, files, materials, quizzes, flashcards, events, tasks, collaboration, billing
- **pgvector** — 2560-dimensional halfvec HNSW indexes for LightRAG embeddings (requires pgvector ≥0.7.0 for halfvec support)
- **Apache AGE** — Graph database extension for LightRAG's knowledge graph storage

### Redis
Progress pub/sub channel for ingest events. Also used for rate limiting when configured.

### Backblaze B2
S3-compatible blob storage for source files, parsed artifacts, and editor-embedded media. The Go gateway presigns PUT/GET URLs; browsers upload/download directly to B2 without proxying through the server.
