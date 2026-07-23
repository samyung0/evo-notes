---
type: Reference
title: Evo Notes — Quickstart
description: Entry point for the evo-notes code wiki. Summarizes the project, tech stack, development commands, and links to all documentation sections.
tags: [quickstart, overview, navigation]
---

# Evo Notes — Code Wiki

Evo Notes is a multi-service study platform: workspaces containing documents (notes, quizzes, flashcards, mindmaps, diagrams), AI-powered content generation, and a RAG pipeline for document-grounded chat. Users upload source files, the pipeline parses them into a knowledge graph, and the editor surfaces AI chat, completion, and generation tools built on that knowledge.

## Tech Stack at a Glance

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, TanStack Router & Query, Plate.js (rich text), Vite, Tailwind CSS, Radix UI, Zustand |
| **Backend** | Go (chi + huma), Postgres 16 with pgvector + Apache AGE, Backblaze B2 (S3-compatible blob), Redis |
| **Pipeline** | Python 3.11, FastAPI, LightRAG (HKU v1.5), Modal (GPU document parsing), Whisper STT |
| **Auth** | Clerk (JWT); dev/E2E bypass modes |
| **Billing** | Stripe (checkout, portal, webhook reconciliation) |
| **API Codegen** | Go → `openapi.yaml` (huma) → orval → TypeScript types + Zod validators |
| **i18n** | Paraglide (en, zh) |
| **Testing** | Vitest (frontend), `go test` (backend), Playwright (e2e), VCR cassettes (pipeline) |

## Repository Layout

```
/server          Go HTTP gateway (chi + huma, Postgres, B2, Redis, Stripe, Clerk)
/src             React frontend (routing, features, Plate editor, design system, mocks)
/pipeline        Python RAG service (LightRAG, ingest worker, retrieval API, Modal parser)
/modal           Modal serverless GPU app (MineRU document parsing)
/cloudflare      Cloudflare Worker (B2 → MinerU OSS relay)
/deploy          Docker Compose (dev + e2e stacks), Postgres+pgvector+AGE image
/e2e             Playwright e2e tests with isolated Docker compose
/openapi.yaml    OpenAPI 3.0.3 spec (generated from Go server)
```

## Development Commands

```bash
# Frontend
pnpm install
pnpm dev              # Vite dev server (MSW mocks on by default)

# Backend (needs Postgres — use Docker Compose below)
cd server && go run ./cmd/api

# Full local stack (Postgres + Redis + Go server + pipeline)
cd deploy && docker compose up

# API code generation
pnpm gen:api:msw      # Go → openapi.yaml → orval TS types + Zod validators
pnpm gen:api:watch    # Watch mode (pairs with `air` in server/)

# Tests
pnpm test             # Vitest frontend unit tests
pnpm e2e               # Playwright e2e (auto-starts Docker compose)
cd server && go test ./internal/...  # Go backend tests
cd pipeline && pytest  # Python pipeline tests (offline + cassette)
```

### Key Environment Variables

- `VITE_USE_MSW` — `true` (default) uses MSW mocks; `false` proxies `/api` to the Go server
- `DATABASE_URL` — Postgres connection string
- `PIPELINE_URL` — Python retrieval service URL (unset → pipeline features disabled)
- `CLERK_SECRET_KEY` / `AUTH_DISABLED` — Clerk JWT validation or dev bypass
- See `server/.env.example`, `pipeline/.env.example`, `deploy/.env.example` for full reference

## Documentation Sections

- [Architecture Overview](architecture/overview.md) — system topology, data flow, service responsibilities
- [Backend: API & Store](backend/api-and-store.md) — Go gateway, HTTP handlers, data model, auth, blob storage, material document validation
- [Frontend: Editor & UI](frontend/editor-and-ui.md) — React app architecture, Plate.js editor, routing, API layer, design system
- [Frontend: Plate.js Editor Deep Dive](frontend/plate-editor.md) — Plate/Slate architecture and the repo's interactive/static editor, persistence, collaboration, AI, media, and extension flows
- [Pipeline: RAG](pipeline/rag-pipeline.md) — LightRAG, ingest worker, retrieval API, Modal GPU parsing, Cloudflare relay
- [Operations: Deployment](operations/deployment.md) — Docker Compose, env vars, Postgres image, CI/CD
- [Testing](testing/e2e-and-unit.md) — Vitest, Go tests, Playwright e2e, pipeline VCR cassettes

## How the Services Connect

The frontend talks exclusively to the Go gateway at `/api`. The gateway handles all CRUD against Postgres, presigned B2 uploads/downloads, Clerk auth, and Stripe webhooks. For AI features (chat, completion, generation, transcription), the gateway proxies requests to the Python retrieval service. The retrieval service queries LightRAG (which stores embeddings in pgvector and knowledge graph in Apache AGE within the same Postgres instance) and streams responses back over SSE. Document ingestion runs in a separate Python worker process that polls a Postgres job queue, fetches source files from B2, parses them on Modal GPU, and inserts them into LightRAG. Progress is published to Redis and fanned out to the browser via SSE.

See [Architecture Overview](architecture/overview.md) for the full topology diagram.

## Backlog

- **Detailed API endpoint reference** (60+ endpoints) — The `openapi.yaml` spec is the canonical source; a human-readable endpoint catalog is deferred.
- **Billing/Stripe deep dive** — Customer sync, checkout, portal, webhook reconciliation, and the `cmd/reconcile` cron are noted but not fully documented.
- **OAuth integration details** (Google Drive / OneDrive import) — Token management and file listing flows are noted but deferred.
- **Thinking space** (Excalidraw canvas) — Feature-flagged, minimal coverage.
