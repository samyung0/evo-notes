---
type: Backend
title: Backend API & Auth
description: Go HTTP gateway API surface, authentication modes, sharing/access control model, pipeline integration, billing, OAuth, and webhook handlers for Evo Notes.
tags: [backend, api, auth, go]
---

# Backend API & Auth

The Go gateway is a thin HTTP layer implementing the frontend's `/api` contract against PostgreSQL. It handles auth, authorization, blob orchestration, pipeline proxying, billing, and webhooks. Heavy ML work (parsing, RAG) is delegated to the Python pipeline service.

**Source**: `server/README.md`, `server/cmd/api/main.go`, `server/internal/httpapi/server.go`

## Entrypoint & Startup Flow

**Source**: `server/cmd/api/main.go`

1. Config from env vars (DATABASE_URL, ADDR, CLERK_SECRET_KEY, STRIPE_*, PIPELINE_URL, REDIS_URL, B2_*)
2. E2E auth validation (if `E2E_AUTH=true`)
3. Postgres connection pool (`store.New`)
4. Blob store selection: `memory`/`disk` (e2e only) or B2 (default, health-checked at startup)
5. Pipeline HTTP client (if `PIPELINE_URL` set)
6. Redis client (if `REDIS_URL` set)
7. Migrations (`MIGRATE=true` by default, embedded SQL applied in order)
8. HTTP server construction → `httpapi.New(config)`
9. Graceful shutdown on SIGINT/SIGTERM (10s deadline)

## Router Architecture

**Source**: `server/internal/httpapi/server.go`

The router is a **hybrid** of chi v5 and Huma v2:

- **Huma** owns all JSON CRUD operations → auto-generates OpenAPI spec (`/openapi.yaml`, docs at `/docs`)
- **Raw chi** handles what Huma can't model: SSE streaming, multipart uploads, blob redirects, webhooks, pipeline passthrough

### Middleware Chain

1. `middleware.Recoverer` — panic recovery
2. CORS — allows all origins, explicit E2E auth headers
3. `auth.Middleware` — multi-mode auth (see below)

### Huma-Registered API Endpoints

#### Workspaces (`huma_workspaces.go`)

| Method | Path | Operation |
|--------|------|-----------|
| GET | `/api/workspaces` | `listWorkspaces` |
| POST | `/api/workspaces` | `createWorkspace` |
| GET | `/api/workspaces/{id}` | `getWorkspace` |
| PATCH | `/api/workspaces/{id}` | `updateWorkspace` |
| PATCH | `/api/workspaces/{id}/sharing` | `updateWorkspaceSharing` |
| DELETE | `/api/workspaces/{id}` | `deleteWorkspace` |
| GET | `/api/workspaces/{id}/stats` | `getWorkspaceStats` |

#### Materials (`huma_materials.go`)

| Method | Path | Operation |
|--------|------|-----------|
| GET | `/api/workspaces/{id}/materials` | `listMaterials` |
| POST | `/api/workspaces/{id}/materials` | `createMaterial` |
| GET | `/api/materials/{id}` | `getMaterial` |
| PATCH | `/api/materials/{id}` | `updateMaterial` |
| DELETE | `/api/materials/{id}` | `deleteMaterial` |

Materials use optimistic concurrency: writes must include `ExpectedRevision`; conflict returns HTTP 409.

#### Collaboration (`huma_collaboration.go`)

| Method | Path | Operation |
|--------|------|-----------|
| GET | `/api/materials/{id}/revisions` | `listMaterialRevisions` |
| GET/POST | `/api/materials/{id}/suggestions` | list/create suggestions |
| PATCH/DELETE | `/api/material-suggestions/{id}` | update status / withdraw |
| GET/POST | `/api/materials/{id}/discussions` | list/create discussions |
| PATCH/DELETE | `/api/discussions/{id}` | update/delete discussions |
| POST/PATCH/DELETE | `/api/discussions/{id}/comments` | comment CRUD |

#### Membership (`huma_membership.go`)

| Method | Path | Operation |
|--------|------|-----------|
| GET | `/api/workspaces/{id}/members` | `listWorkspaceMembers` |
| PATCH/DELETE | `/api/workspaces/{id}/members/{memberId}` | update/remove member |
| GET | `/api/workspaces/{id}/invites` | `listWorkspaceInvites` |
| GET | `/api/workspaces/{id}/invite-candidates` | `searchWorkspaceInviteCandidates` |
| POST | `/api/workspaces/{id}/invites` | `createWorkspaceInvite` |
| DELETE | `/api/workspaces/{id}/invites/{inviteId}` | `revokeWorkspaceInvite` |
| POST | `/api/workspace-invites/{token}/accept` | `acceptWorkspaceInvite` |

### Raw Chi Routes (Non-OpenAPI)

**Source**: `server/internal/httpapi/server.go:100-119`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/healthz` | Health check |
| POST | `/webhooks/clerk` | Clerk user sync |
| POST | `/webhooks/stripe` | Stripe billing events |
| POST | `/api/workspaces/{id}/sources` | File upload (multipart or JSON) |
| POST | `/api/workspaces/{id}/sources/uploads` | Reserve upload slot |
| POST | `.../uploads/{uploadId}/complete` | Complete multipart upload |
| POST | `/api/workspaces/{id}/editor-assets/uploads` | Editor asset upload |
| GET | `/api/editor-assets/{assetId}/resolve` | Editor asset resolution |
| POST | `/api/workspaces/{id}/sources/import` | Bulk source import (OAuth) |
| GET | `/api/workspaces/{id}/ingest-events` | SSE for ingest progress |
| POST | `/api/workspaces/{id}/chat` | AI chat (sync) |
| POST | `/api/workspaces/{id}/chat/stream` | AI chat (SSE streaming) |
| POST | `/api/workspaces/{id}/complete/stream` | AI completion (SSE) |
| POST | `/api/workspaces/{id}/ai/command` | AI command |
| POST | `/api/workspaces/{id}/ai/copilot` | AI copilot |
| POST | `/api/workspaces/{id}/generate` | Material generation |
| POST | `/api/transcribe` | Audio transcription (Whisper) |
| GET | `/api/files/{id}/raw` | Raw file download (B2 redirect) |

## Authentication Modes

**Source**: `server/internal/auth/middleware.go`

The middleware supports four modes:

### 1. Clerk JWT (Production)
- Wraps handler in `clerkhttp.WithHeaderAuthorization()`
- Extracts `claims.Subject` as user ID
- Lazy provisioning: calls `UpsertUserFromClerk()` on first authenticated request; creates default workspace for new users

### 2. Dev Mode (Local Development)
- When `AUTH_DISABLED=true` or no Clerk secret
- Injects `DevUserID` (default `u_1`) into context
- E2E headers rejected

### 3. E2E Auth (Disposable Tests)
- When `E2E_AUTH=true` (requires `APP_ENV=e2e`)
- Validates `X-E2E-User-Id` + `X-E2E-Secret` headers
- User ID must be in allowlisted `E2EUserIDs`

### 4. Anonymous Public Read
- For GET/HEAD to public-read prefix paths (`/api/workspaces/`, `/api/materials/`, etc.)
- If no credentials present, request passes with empty user ID
- Handlers enforce visibility at the data layer
- If credentials ARE present on public-read paths, they're authenticated normally

**Always-bypass paths**: `/healthz`, `/webhooks/clerk`, `/webhooks/stripe`

## Sharing & Access Control

**Source**: `server/internal/store/share.go`

The sharing model is the core authorization system. See [Data Model](../architecture/data-model.md) for the full entity relationship and access resolution rules.

Key design principle: `ErrForbidden` is mapped to `ErrNotFound` in shared-resource handlers, so unauthorized access is indistinguishable from a missing resource (security through obscurity).

### Helper Functions

- `assertWS(w, r, wsID)` — asserts workspace editor permission; `ErrForbidden` → `ErrNotFound`
- `assertWSRead(w, r, wsID)` — asserts workspace read access
- `MaterialEffectiveAccess(userID, matID)` — returns `MaterialAccessInfo{Role, Explicit}`
- `CapabilitiesForRole(role, canView)` — returns `AccessCapabilities{CanView, CanEdit, CanComment, CanManageMembers}`

## Pipeline Integration

**Source**: `server/internal/pipeline/client.go`

The gateway is a thin HTTP client to the Python retrieval service. Three transport methods:

| Method | Purpose | Timeout |
|--------|---------|---------|
| `PostRaw` | Sync JSON → JSON (chat, generate, AI commands) | 90s |
| `PostStream` | JSON → SSE stream (streaming chat/completion) | Context-governed (no read timeout) |
| `PostMultipart` | Multipart upload (Whisper transcription) | 90s |

The streaming client deliberately has no read timeout so long token streams aren't cut off. Cancellation is driven by the request context (browser disconnect). On any error, callers fall back to local placeholders so the app keeps working even when the pipeline is down.

See [RAG Pipeline](../pipeline/rag-pipeline.md) for the Python side.

## File Upload Flow

**Source**: `server/internal/httpapi/server.go:214-337`

Parse mode selection:
- `advanced` (default) — 100 MB max, Modal GPU MineRU
- `normal` — 10 MB max, MinerU Lite free API
- `none` — no indexing, file marked ready directly

Upload flow:
1. File bytes stored in B2 (presigned upload)
2. If `parseMode != "none"` or text kind: `CreateSourceWithJob()` — creates file row (status=`processing`) + enqueues ingest job
3. If `parseMode == "none"`: `CreateSourceReady()` — creates file row directly as `ready`

File downloads (`GET /api/files/{id}/raw`) never proxy bytes through the gateway — B2 redirects to short-lived presigned URLs. Inline content is served only for text-based files.

## Billing (Stripe)

**Source**: `server/internal/billing/stripe.go`

Uses `stripe-go/v82`. Subscription tiers: `free` (default), `pro` (`STRIPE_PRICE_PRO`), `team` (`STRIPE_PRICE_TEAM`).

Key functions: `CreateCustomer`, `CreateCheckoutSession` (subscription-mode, Stripe-hosted URL), `CreatePortalSession`, `PlanTierFromPrice`, `SubscriptionStatus`.

### Reconcile Command

**Source**: `server/cmd/reconcile/main.go`

A standalone Go binary that syncs Stripe subscription state with the local database. Designed to run daily via cron. Handles cases where webhook delivery fails or subscriptions change outside the webhook flow.

## OAuth Cloud Provider Integrations

**Source**: `server/internal/integrations/oauth.go`

File import from three providers (OAuth tokens managed in Clerk):

| Provider | Download Function |
|----------|-------------------|
| Google Drive | `DownloadGoogleFile` — exports native Google Docs as PDF |
| Microsoft OneDrive | `DownloadMicrosoftFile` — via Microsoft Graph API |
| Notion | (planned) |

File extensions are classified into `FileKind` via `KindFromName()` which feeds into the worker's parsing decision tree.

## Webhook Handlers

**Source**: `server/internal/httpapi/webhooks.go`

### Clerk Webhooks
- Uses svix for signature verification
- Handles user lifecycle: `UpsertUserFromWebhook` (signup), `CreateDefaultWorkspace` (new users), `MarkUserDeleted` (deletion)

### Stripe Webhooks
- Uses `webhookStore` interface for testability
- `UserIDByStripeCustomer`, `SetStripeCustomerID`, `UpdateSubscriptionByCustomerID`

### Idempotency
- `WebhookProcessed(ctx, id)` — checks if already processed
- `RecordWebhookEvent` — audit log
- `MarkWebhookProcessed` — marks as processed (with optional error)

## Source References

| Component | Source File |
|-----------|-------------|
| Entrypoint | `server/cmd/api/main.go` |
| Router | `server/internal/httpapi/server.go` |
| Auth middleware | `server/internal/auth/middleware.go` |
| Workspaces API | `server/internal/httpapi/huma_workspaces.go` |
| Materials API | `server/internal/httpapi/huma_materials.go` |
| Collaboration API | `server/internal/httpapi/huma_collaboration.go` |
| Membership API | `server/internal/httpapi/huma_membership.go` |
| Sharing model | `server/internal/store/share.go` |
| Pipeline client | `server/internal/pipeline/client.go` |
| Billing | `server/internal/billing/stripe.go` |
| OAuth | `server/internal/integrations/oauth.go` |
| Webhooks | `server/internal/httpapi/webhooks.go` |
| Reconcile | `server/cmd/reconcile/main.go` |
| Store/queries | `server/internal/store/queries.go` |
| Store/models | `server/internal/store/models.go` |
| Enums | `server/internal/store/enums.go` |
