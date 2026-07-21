---
type: Operations
title: Deployment & Operations
description: Docker deployment stack, environment variables, B2/Redis/Postgres configuration, and the Stripe reconcile cron job for Evo Notes.
tags: [operations, deployment, docker, infrastructure]
---

# Deployment & Operations

Evo Notes runs as a multi-service Docker stack. The Go gateway and Python pipeline share a single PostgreSQL database. Backblaze B2 handles blob storage. Redis handles real-time ingest progress.

## Docker Compose Stack

**Source**: `deploy/docker-compose.yml`

### Services

| Service | Image/Build | Port | Purpose |
|---------|-------------|------|---------|
| **db** | Custom Postgres 16 + pgvector + Apache AGE | 5432, 5433 | LightRAG's KV/vector/graph/doc-status backends. AGE preloaded via `shared_preload_libraries=age`. |
| **redis** | `redis:7-alpine` | 6379 | Pub/sub bus for live ingest progress (worker → server → SSE) |
| **server** | Go gateway (built from `../server`) | 8080 | Frontend's `/api`. Writes uploads to B2, subscribes to Redis, fans progress over SSE. |
| **worker** | Python ingest worker (built from `../pipeline`) | — | LightRAG ingestion. Parses on Modal GPU MineRU, builds graph in Postgres. |
| **retrieval** | Python FastAPI (same pipeline image, command override) | 8001 | Per-workspace LightRAG chat/generate queries. |

### Environment Wiring

All services share `DATABASE_URL: postgres://evo:evo@db:5432/evo?sslmode=disable`.

- **Server** receives: `PIPELINE_URL=http://retrieval:8001`, Clerk auth keys, Stripe keys, B2 config, `AUTH_DISABLED=true` (dev default)
- **Worker** receives: `MODAL_PARSE_URL`, `MODAL_PARSE_TOKEN`, `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, `GOOGLE_API_KEY`, embedding config, MinerU relay config, B2 credentials, `DATABASE_URL`, `REDIS_URL`
- **Retrieval** receives: same model API keys, `DATABASE_URL`, embedding config

### Key Config Notes

- `AUTH_DISABLED` defaults to `true` in dev (dev mode uses fixed user ID `u_1`)
- B2 credentials are required for production; startup verifies bucket access and exits if invalid
- Migrations are applied automatically on server startup (`MIGRATE=true` default)

## E2E Docker Stack

**Source**: `deploy/docker-compose.e2e.yml`

Disposable stack for Playwright/backend access tests:

- Only **db** + **server** (no Redis, no B2, no pipeline)
- `BLOB_BACKEND: memory` — in-memory blob storage
- `AUTH_DISABLED: true`, `E2E_AUTH: true` with shared secret
- Pre-defined test user IDs: `u_owner`, `u_editor`, `u_commenter`, `u_viewer`, `u_other`
- Host ports offset (db: 55432, server: 18080) to run alongside dev stack
- Separate volume (`evo_e2e_pgdata`)

See [Testing & E2E](../testing/e2e.md) for the test framework.

## Environment Variables

### Frontend (Vite)

**Source**: `.env.example`

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_USE_MSW` | `true` | Enable MSW mocks (false = real gateway) |
| `VITE_PORT` | `5173` | Vite dev server port |
| `VITE_API_URL` | `http://localhost:8080` | Gateway URL (Vite proxies `/api` here) |
| `VITE_CLERK_PUBLISHABLE_KEY` | — | Clerk frontend key (required when MSW off) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | — | Stripe.js (optional, checkout redirects server-side) |
| `VITE_DIRECT_B2_UPLOAD` | `true` | Upload files directly to B2 instead of proxying |

### Go Gateway

**Source**: `server/.env.example`, `server/cmd/api/main.go`

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgres://evo:evo@localhost:5432/evo?sslmode=disable` | Postgres DSN |
| `ADDR` | `:8080` | Listen address |
| `MIGRATE` | `true` | Apply migrations on startup |
| `APP_URL`, `APP_ENV` | — | App URL and environment (`e2e` for tests) |
| `CLERK_SECRET_KEY` | — | Clerk JWT verification |
| `CLERK_WEBHOOK_SECRET` | — | Clerk webhook signature verification |
| `AUTH_DISABLED` | `false` | Dev mode (fixed user ID) |
| `DEV_USER_ID` | `u_1` | User ID in dev mode |
| `E2E_AUTH` | `false` | E2E header-based auth |
| `E2E_AUTH_SECRET` | — | Shared secret for e2e auth |
| `E2E_AUTH_USER_IDS` | — | Allowlisted e2e user IDs |
| `STRIPE_SECRET_KEY` | — | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook signature |
| `STRIPE_PRICE_PRO` | — | Stripe price ID for Pro tier |
| `STRIPE_PRICE_TEAM` | — | Stripe price ID for Team tier |
| `PIPELINE_URL` | — | Python retrieval service URL |
| `REDIS_URL` | — | Redis URL (pub/sub for ingest progress) |
| `B2_*` | — | Backblaze B2 credentials (bucket, key, secret, endpoint) |
| `EVO_PARSER` | `docling` | Default parser (historical) |
| `EVO_ENGINE` | `linearrag` | Default RAG engine (historical) |

### Pipeline

**Source**: `pipeline/.env.example`, `pipeline/pipeline/config.py`

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres DSN (shared with gateway) |
| `REDIS_URL` | Redis URL for progress pub/sub |
| `OPENROUTER_API_KEY` | Embedding model provider |
| `DEEPSEEK_API_KEY` | Text LLM provider |
| `GOOGLE_API_KEY` | Gemini VLM provider |
| `MODAL_PARSE_URL` | Modal GPU MineRU endpoint |
| `MODAL_PARSE_TOKEN` | Modal auth token |
| `MINERU_RELAY_URL` | Cloudflare Worker relay URL (optional) |
| `B2_*` | B2 credentials for source download/artifact upload |
| `LLM_CACHE` | Enable LLM response caching (ingest only) |

## Postgres Configuration

**Source**: `deploy/postgres/Dockerfile`

Custom Postgres 16 image with:

- **pgvector** extension for vector embeddings
- **Apache AGE** extension for LightRAG graph storage (preloaded via `shared_preload_libraries=age`)
- Ports: 5432 (primary) + 5433 (escape hatch)

## Backblaze B2

B2 is the blob storage backend for:

- Uploaded source files (PDF, DOCX, etc.)
- Parsed artifacts (cached MineRU output bundles)
- Editor assets (images pasted into the editor)

The gateway generates presigned URLs for direct browser↔B2 uploads and downloads, avoiding proxying through the server. See [Backend API & Auth](../backend/api-and-auth.md) for the upload flow.

B2 CORS configuration example: `deploy/b2-cors.example.json`.

## Reconcile Cron

**Source**: `server/cmd/reconcile/main.go`

A standalone Go binary that syncs Stripe subscription state with the local database. Designed to run daily via cron.

**Flow**: Init Stripe → Connect to Postgres → List all local Stripe customer records → For each, query Stripe for active/trialing subscriptions → If local DB differs from Stripe ("drift"), update the local record.

This handles cases where webhook delivery fails or subscriptions change outside the webhook flow (e.g., Stripe dashboard edits, expired cards, dunning).

## Running Standalone

### Go Gateway Only

```bash
cd server
cp .env.example .env
go mod tidy
go run ./cmd/api
# Gateway on http://localhost:8080
```

Requires a reachable Postgres at `DATABASE_URL` and valid B2 credentials.

### Pipeline Only

```bash
cd pipeline
uv sync
python -m pipeline.ingest.worker    # Worker mode
# OR
uvicorn pipeline.retrieve:app --port 8001  # Retrieval mode
```

## Source References

| Component | Source File |
|-----------|-------------|
| Docker compose | `deploy/docker-compose.yml` |
| E2E compose | `deploy/docker-compose.e2e.yml` |
| Postgres image | `deploy/postgres/Dockerfile` |
| Server Dockerfile | `server/Dockerfile` |
| Pipeline Dockerfile | `pipeline/Dockerfile` |
| Frontend env | `.env.example` |
| Server env | `server/.env.example` |
| Pipeline env | `pipeline/.env.example` |
| Reconcile | `server/cmd/reconcile/main.go` |
| B2 CORS example | `deploy/b2-cors.example.json` |
| Air config | `server/.air.toml` |
