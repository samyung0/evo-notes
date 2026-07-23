---
type: Backend
title: "Backend: API & Store"
description: Go HTTP gateway for evo-notes — server entrypoint, middleware stack, huma API surface, raw chi routes, Postgres data model, auth, blob storage, material document validation, and pipeline client.
tags: [backend, go, api, database, auth, storage]
---

# Backend: API & Store

The Go server (`server/`) is a thin HTTP gateway implementing the frontend's `/api` contract against Postgres. Heavy ML work (document parsing, RAG retrieval, AI generation) is delegated to the Python [pipeline](../pipeline/rag-pipeline.md).

## Entrypoint

**`server/cmd/api/main.go`** — All config is environment-variable-driven. Startup sequence:

1. Opens a pgx pool (`store.New`)
2. Opens blob store — B2 (S3) by default; in-memory for `APP_ENV=e2e`
3. Optionally creates a `pipeline.Client` if `PIPELINE_URL` is set
4. Optionally connects Redis for rate-limiting
5. Runs embedded SQL migrations (`st.Migrate`) if `MIGRATE=true` (default)
6. Spawns a background goroutine to expire stale workspace invites every minute
7. Builds the HTTP handler via `httpapi.New(...)` and starts `http.Server`
8. Graceful shutdown on SIGINT/SIGTERM (10s timeout)

**`server/cmd/openapi/main.go`** — Standalone command emitting `openapi.yaml` by calling `httpapi.SpecYAML()`. Writes atomically (temp + rename) so `orval --watch` never sees a truncated spec.

## HTTP Server

**`server/internal/httpapi/server.go`**

### Middleware Stack (order matters)
1. **Recoverer** — panic recovery
2. **CORS** — allows all origins, includes E2E custom headers (`X-E2E-User-Id`, `X-E2E-Secret`)
3. **Auth Middleware** — Clerk JWT validation / dev bypass / E2E identity

### Two Route Categories

**Huma JSON CRUD** — 60+ endpoints auto-documented in OpenAPI, organized by tag: Workspaces, Content, Materials, Collaboration, Membership, Chat, Quizzes, Flashcards, Sharing, Schedule, Tags, Thinking, Account, Billing & Integrations, Explore.

**Raw chi routes** (excluded from OpenAPI) — Endpoints huma can't model:
- `GET /healthz`
- `POST /webhooks/clerk`, `POST /webhooks/stripe`
- `POST /api/workspaces/{id}/sources` (multipart upload or JSON metadata)
- `POST /api/workspaces/{id}/sources/uploads` + `.../complete` (presigned B2 flow)
- `POST /api/workspaces/{id}/editor-assets/uploads` + `.../complete`
- `POST /api/workspaces/{id}/sources/import` (bulk Google Drive/OneDrive)
- `GET /api/workspaces/{id}/ingest-events` (SSE for ingest progress)
- `GET /api/editor-assets/{assetId}/resolve` (editor media → presigned B2 URL)
- `POST /api/workspaces/{id}/chat`, `.../chat/stream`, `.../complete/stream`
- `POST /api/workspaces/{id}/ai/command`, `.../ai/copilot`, `.../ai/generate`
- `POST /api/transcribe` (audio → Whisper via pipeline)
- `GET /api/files/{id}/raw` (redirect to presigned B2 URL)

### Access Control
Helper functions enforce workspace/material ownership or link/public visibility:
- `assertWS` — editor check
- `assertWSRead` — read check
- `workspaceRead`, `materialRead`, `fileRead` — visibility enforcement
- Forbidden responses are collapsed to 404 to prevent existence leakage

## Data Model

**`server/internal/store/`` — `Store` struct wraps a `pgxpool.Pool`.

### Key Entities (`models.go`)

| Entity | Notes |
|--------|-------|
| **User** | Synced from Clerk on first auth; tracks plan tier, subscription status, streak |
| **Workspace** | Owner via `user_id`; privacy (private/link/public); supports member collaboration with roles |
| **Chapter** | Ordered file groups within a workspace |
| **File** | Source document with `status` (processing/ready/failed), `blob_path` for B2, `doc_id` maps to LightRAG document |
| **Material** | Universal envelope for notes/quizzes/flashcards/mindmaps/diagrams — `content` is jsonb Plate document; optimistic concurrency via `revision` |
| **MaterialRevision** | Full history of material content changes |
| **Deck** / **Flashcard** | Flashcard container (material kind=flashcards); SRS scheduling via FSRS in `card_stats` |
| **Quiz** / **Attempt** | Material kind=quiz; attempts snapshot questions + answers |
| **Conversation** / **Message** | Workspace-scoped chat threads with RAG citations |
| **WorkspaceMember** / **WorkspaceInvite** | Explicit membership; invites use SHA-256 hashed tokens, 7-day expiry |
| **MaterialSuggestion** | Inline edit suggestion with base revision, anchor, original/proposed fragments |
| **Discussion** / **Comment** | Threaded discussions on material blocks; rich-text comments |
| **Event** / **Label** / **Task** | Calendar and todo planner |
| **Canvas** | Excalidraw-like thinking canvas (jsonb scene) |
| **Notification** | In-app notifications |
| **UploadSession** / **EditorAsset** | Presigned B2 upload lifecycle tracking |

### Enums (`enums.go`)
All enums implement `huma.SchemaProvider` for OpenAPI: `UserColor`, `Privacy`, `WorkspaceRole` (owner/editor/commenter/viewer), `ShareRole`, `SuggestionStatus`, `PlanTier`, `SubscriptionStatus`, `NotificationKind`, `SearchKind`, `FileKind`, `FileStatus`.

### Migrations (`server/migrations/`)
- **`0001_init.sql`** — Squashed baseline (44KB), creates all tables + extensions (`pgvector`, `age`). Extensions provide LightRAG's storage: pgvector for 2560-dim halfvec HNSW embeddings, Apache AGE for the knowledge graph.
- **`0002_content_positions.sql`** — Adds `position` column to `files` and `materials` for drag-and-drop ordering within chapters.
- **`embed.go`** — `//go:embed *.sql` embeds migrations into the binary; `Migrate()` runs them in filename order on startup.

### Store Files

| File | Responsibility |
|------|---------------|
| `queries.go` | Patch types, workspace/chapter/file/quiz/deck/canvas CRUD, search, billing, tags |
| `share.go` | Access control: `WorkspaceAccess()`, `MaterialAccess()`, `CapabilitiesForRole()`, `CloneWorkspace/Material()` |
| `collaboration.go` | Workspace members, invites, material revisions/suggestions/discussions/comments |
| `chat.go` | Conversation and message CRUD |
| `jobs.go` | `CreateSourceWithJob` (inserts file + job in one transaction), Postgres-backed queue claimed via `SKIP LOCKED` |
| `uploads.go` | UploadSession lifecycle (presigned B2), idempotent finalization |
| `users.go` | `UpsertUserFromClerk()` (detects first sign-in via `xmax=0`), `CreateDefaultWorkspace()` (advisory-locked) |
| `editor_assets.go` | Editor media reservation + finalization with size limits (image ≤20MB, audio ≤100MB, video ≤500MB, pdf ≤50MB, file ≤100MB) |

## Authentication

**`server/internal/auth/middleware.go`**

Three modes controlled by environment:
1. **Clerk JWT** (production) — Validates Bearer JWTs via `clerkhttp.WithHeaderAuthorization()`. On first sign-in, upserts user + creates default workspace.
2. **Dev bypass** — When `AUTH_DISABLED=true` or `CLERK_SECRET_KEY` is empty, injects `DEV_USER_ID` (default `u_1`).
3. **E2E auth** — When `E2E_AUTH=true` (requires `APP_ENV=e2e`), validates `X-E2E-User-Id` + `X-E2E-Secret` headers against allowlisted IDs.

Public routes (`/healthz`, webhooks) skip auth. Public read paths allow unauthenticated GET/HEAD — handlers enforce private/link/public visibility themselves.

## Blob Storage

**`server/internal/blob/`**

- **`blob.Store` interface** — `Put`, `PresignGet`, `PresignPut`, `Head`, `ReadPrefix` (bounded byte prefix for signature inspection), `Promote` (rename within bucket), `Delete`
- **`B2` struct** (`s3.go`) — AWS SDK v2 S3 client against Backblaze B2. Presign TTL defaults to 15 minutes.
- **`Memory` struct** (`memory.go`) — In-process map for E2E tests only

## Material Document Validation

**`server/internal/materialdoc/document.go`**

Validates the persisted JSON for Plate documents (`Material.content`):
- `Envelope` struct: `schemaVersion: 1` + `value` (array of Plate nodes)
- Limits: 2MB max, 64 depth, 10,000 nodes
- `ValidateKind()` ensures content matches declared material kind (note/quiz/flashcards/mindmap/diagram)
- Custom study nodes: question types (mcq, multi, boolean, fill, short, matching, ordering), cognitive levels (recall, application, analysis), flashcard cards
- Mirrors the frontend's `src/features/materials/document.ts` type definitions

## Pipeline Client

**`server/internal/pipeline/client.go`**

Thin HTTP client for the Python retrieval/generate service:
- `PostStream(ctx, path, body)` → `io.ReadCloser` — SSE streaming (chat, completion). No read timeout; cancellation driven by request context.
- `PostMultipart(ctx, path, filename, reader)` → JSON — Audio transcription.
- `PostRaw(ctx, path, body)` → JSON — Synchronous calls (workspace clone RAG copy, generate).

`a.pipe` is nil when `PIPELINE_URL` is unset — pipeline calls are best-effort with local fallbacks.

## Billing

- **Stripe** (`server/internal/billing/stripe.go`) — Customer sync, checkout sessions, portal sessions, subscription status. Webhook at `POST /webhooks/stripe`.
- **`server/cmd/reconcile/main.go`** — Daily cron syncing Stripe subscription state with the local database.
