---
type: Quickstart
title: Evo Notes Quickstart
description: Entry point for the Evo Notes code wiki. Covers project overview, local development setup, architecture summary, and links to all documentation sections.
tags: [quickstart, overview]
---

# Evo Notes — Quickstart

Evo Notes is a study workspace application that combines note-taking, AI-powered document parsing, spaced repetition, quizzes, flashcards, and collaborative editing. It is a full-stack monorepo with a React/TypeScript frontend, a Go HTTP gateway, a Python RAG pipeline, and GPU-based document parsing via Modal.

## What This Wiki Covers

| Section | What's Inside |
|---------|--------------|
| [Architecture Overview](architecture/overview.md) | System topology, request flow, service boundaries |
| [Data Model](architecture/data-model.md) | Core entities, relationships, enums, material envelope, sharing model |
| [Backend API & Auth](backend/api-and-auth.md) | HTTP API surface, auth modes, sharing/access control, billing, OAuth integrations |
| [Frontend Editor & UI](frontend/editor-and-ui.md) | React app bootstrap, routing, Plate.js editor, collaboration, AI chat, state management |
| [RAG Pipeline](pipeline/rag-pipeline.md) | LightRAG, document parsing backends, embedding/LLM models, ingest worker |
| [Deployment & Operations](operations/deployment.md) | Docker stack, env vars, B2/Redis/Postgres, reconcile cron |
| [Testing & E2E](testing/e2e.md) | Playwright e2e framework, test users, unit tests |

## Quick Start

### Prerequisites

- **Node.js** + **pnpm** (frontend)
- **Go 1.25** (gateway)
- **Python 3.11+** + **uv** (pipeline)
- **Docker** (recommended for full stack with Postgres + Redis)

### 1. Full Stack via Docker

```bash
docker compose -f deploy/docker-compose.yml up --build
# Gateway: http://localhost:8080
# Frontend: pnpm dev (separately, or use VITE_USE_MSW=false to hit the real gateway)
```

Services in the compose stack: Postgres 16 (pgvector + Apache AGE), Redis 7, Go gateway, Python ingest worker, Python retrieval service. See [Deployment & Operations](operations/deployment.md) for details.

### 2. Frontend-Only (MSW Mocks)

```bash
cp .env.example .env.local   # VITE_USE_MSW=true is default
pnpm install
pnpm dev                     # http://localhost:5173
```

MSW (Mock Service Worker) intercepts all `/api` calls and returns mock data, so no backend is needed for UI development.

### 3. Frontend + Real Gateway

```bash
# Start the Go gateway (see server/README.md)
cd server && go run ./cmd/api   # http://localhost:8080

# Point the frontend at it
VITE_USE_MSW=false pnpm dev
```

Vite proxies `/api` → `http://localhost:8080` (see `vite.config.ts`).

### 4. Code Generation (OpenAPI → TypeScript)

The Go gateway serves as the OpenAPI spec source of truth. The frontend uses orval to generate TypeScript API types, hooks, and Zod validators from the spec.

```bash
pnpm gen:openapi    # Generate openapi.yaml from Go server
pnpm gen:api        # Generate TS types/hooks/validators via orval
pnpm gen:api:msw    # Both in sequence
```

Generated files live in `src/api/gen/`. See [Frontend Editor & UI](frontend/editor-and-ui.md).

## Key Concepts

- **Workspace** — The top-level organizational unit. Owns files, materials, chapters. Can be private, link-shared, or public.
- **Material** — A universal document envelope (migration `0010_unify_materials.sql` consolidated quizzes, flashcards, mindmaps, diagrams into one table). Content is a Plate.js JSON document.
- **File/Source** — Uploaded source documents (PDF, DOCX, etc.) parsed through the RAG pipeline for AI chat and generation.
- **Sharing Model** — Multi-layer access: owner, explicit workspace members (role-based), and shared non-members (link/public with share role). See [Backend API & Auth](backend/api-and-auth.md).
- **Plate Editor** — Rich text editor (Plate.js v53) with collaboration features: suggestions, discussions, comments. See [Frontend Editor & UI](frontend/editor-and-ui.md).
- **LightRAG** — Per-workspace RAG with pgvector embeddings and Apache AGE graph storage. See [RAG Pipeline](pipeline/rag-pipeline.md).

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, TanStack Router/Query, Plate.js, Tailwind CSS 4, Zustand, Clerk Auth |
| Gateway | Go 1.25, chi v5, Huma v2 (OpenAPI-first), pgx/v5, Backblaze B2 |
| Pipeline | Python 3.11, LightRAG, FastAPI, asyncpg/psycopg, boto3 |
| Parsing | Modal GPU (MineRU), MinerU Lite API, Cloudflare Worker relay |
| Infra | PostgreSQL 16 (pgvector + Apache AGE), Redis 7, Backblaze B2 |
| Billing | Stripe (subscription tiers: free, pro, team) |
| Testing | Vitest (unit), Playwright (e2e) |

## Architecture Diagram

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  Frontend   │────▶│  Go Gateway  │────▶│  Postgres 16  │
│  (Vite+React)│     │  (server)    │     │ +pgvector+AGE │
└─────────────┘     └──────┬───────┘     └───────┬───────┘
                           │                     │
                    ┌──────┴──────┐       ┌───────┴───────┐
                    │  Redis 7    │       │  LightRAG     │
                    │ (progress)  │       │  tables       │
                    └──────┬──────┘       └───────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
    │ Ingest      │ │ Retrieval  │ │  Backblaze │
    │ Worker      │ │ FastAPI    │ │  B2 (blob) │
    └──────┬──────┘ └────────────┘ └────────────┘
           │
    ┌──────▼──────────────────────────────┐
    │  Parsing Backends:                   │
    │  ├─ Modal GPU MineRU (advanced)      │
    │  ├─ MinerU Lite free API (normal)    │
    │  │  └─ via Cloudflare Worker relay   │
    │  └─ Direct RAW insert (txt/md)       │
    └──────────────────────────────────────┘
```

See [Architecture Overview](architecture/overview.md) for detailed request/data flow.

## Backlog

| Area | Source Anchor | Reason Deferred |
|------|--------------|----------------|
| Input validation & sanitization | `todo` line 3 | Low priority per maintainer notes |
| Error handling improvements | `todo` line 4 | Low priority per maintainer notes |
| Pagination | `todo` line 6 | Not yet implemented |
| Soft-delete for files | `todo` line 20 | Not yet implemented |
| Rate limiting & analytics | `todo` line 11 | Not yet implemented |
| Excalidraw canvas feature | `src/routes/Canvas.tsx` | Minimal exploration, not a primary domain |
| Schedule (calendar) feature | `src/features/schedule/` | Secondary feature, not deeply documented |
| Tasks feature | `src/routes/Tasks.tsx` | Secondary feature, not deeply documented |
| Thinking space | `src/routes/Thinking.tsx` | Minimal exploration, not a primary domain |
