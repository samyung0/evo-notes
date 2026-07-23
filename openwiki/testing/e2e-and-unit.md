---
type: Testing
title: Testing
description: Testing strategy for evo-notes — Vitest frontend unit tests, Go backend tests, Playwright e2e with isolated Docker compose, and pipeline VCR cassette tests.
tags: [testing, vitest, go-test, playwright, e2e, vcr]
---

# Testing

Evo Notes uses four testing tiers: frontend unit tests (Vitest), Go backend tests, Playwright e2e tests (with Docker isolation), and pipeline tests (offline unit + VCR cassette integration).

## Frontend Unit Tests — Vitest

```bash
pnpm test    # vitest run src
```

Test files are colocated with source files (`.test.ts` / `.test.tsx` suffix). Key test areas:

| Test File | What It Covers |
|-----------|---------------|
| `src/features/notes/editorMode.test.ts` | Editor mode resolution, capability checks |
| `src/features/notes/richBlockConfig.test.ts` | Callout variants, code language list, column layouts |
| `src/features/notes/insertEditorNode.test.ts` | Node insertion logic |
| `src/features/notes/responsiveToolbar.test.ts` | Toolbar responsive behavior |
| `src/features/notes/suggestions.test.ts` | Suggestion workflow logic |
| `src/features/notes/noteEditorPrefs.test.ts` | Editor preferences |
| `src/features/notes/media.test.ts` | Media node handling |
| `src/features/notes/Collaboration.test.tsx` | Collaboration provider, suggestions, discussions |
| `src/features/materials/modePolicy.test.ts` | Material mode → capabilities mapping |
| `src/features/materials/staticNodeComponents.test.tsx` | Static Plate rendering |
| `src/features/materials/document.test.ts` | Material document validation |
| `src/features/quizzes/QuizForm.test.ts` | Quiz form validation |
| `src/features/workspace/access.test.ts` | Workspace access helpers |
| `src/api/plateAiTransport.test.ts` | Plate AI transport field stripping |

## Go Backend Tests

```bash
cd server && go test ./internal/...
```

Test files are colocated with source (e.g., `share_test.go` next to `share.go`). Key test areas:

| Test File | What It Covers |
|-----------|---------------|
| `server/internal/store/share_test.go` | Workspace access control, cloning |
| `server/internal/store/share_access_test.go` | Material/file access enforcement |
| `server/internal/store/workspace_sharing_test.go` | Workspace member roles, invites |
| `server/internal/store/contracts_test.go` | Store contract tests |
| `server/internal/httpapi/huma_collaboration_test.go` | Collaboration HTTP endpoints |
| `server/internal/httpapi/share_access_test.go` | HTTP access control |
| `server/internal/httpapi/ai_plate_test.go` | Plate AI endpoint |
| `server/internal/httpapi/editor_assets_test.go` | Editor asset upload lifecycle |
| `server/internal/httpapi/webhooks_test.go` | Clerk/Stripe webhook handlers |
| `server/internal/httpapi/helpers_test.go` | HTTP test helpers |
| `server/internal/auth/middleware_test.go` | Auth middleware (Clerk, dev, E2E modes) |
| `server/internal/blob/blob_test.go` | Blob store (S3/B2) |
| `server/internal/materialdoc/document_test.go` | Material document validation |

Go backend tests also run as part of the Playwright e2e global setup (against the e2e Postgres instance).

## Playwright E2E Tests

**`playwright.config.ts`** (root) — Playwright with automatic Docker Compose orchestration:

- Generates random ports + random compose project name (`evo-notes-e2e-{pid}-{hex}`) for parallel isolation
- **`globalSetup`**: Starts e2e Docker compose stack, waits for `/healthz`, applies SQL seed, then runs `go test ./internal/store ./internal/httpapi`
- **`globalTeardown`**: `docker compose down -v --remove-orphans`
- **`webServer`**: Starts Vite dev server with `VITE_USE_MSW=false`, no Clerk key, feature flags enabled
- Projects: Chromium only. CI: 2 workers, 1 retry. Local: default workers, 0 retries

### Fixtures (`e2e/fixtures/`)

| File | Purpose |
|------|---------|
| `actors.ts` | 6 actor personas (owner, editor, commenter, viewer, other, anonymous) as `Page` + `APIRequestContext`. Injects E2E auth headers via `context.route()`. |
| `seed.ts` | TypeScript constants: 5 users, 6 workspaces (private/link/public/editable/invite/mutate), quizzes, decks, notes with known IDs |
| `seed.sql` | SQL seed: users, workspaces with various privacy levels, workspace_members with roles, chapters, materials, notes, quizzes, decks |

### Test Specs (`e2e/sharing/`)

Five spec files testing access control across roles:

| Spec | Tests |
|------|-------|
| `workspace-sharing.spec.ts` | Owner can edit/share; editor can edit but not manage members; non-members/anonymous get 404; privacy mode switching; clone button visibility |
| `material-modes.spec.ts` | Anonymous always gets static view; commenters can suggest (insertions/deletions with highlights); comments render selected text |
| `deck-sharing.spec.ts` | Private deck denied to non-members; link/public readable; clone behavior; card review mutation blocked for non-owners |
| `quiz-sharing.spec.ts` | Private quiz denied; link/public readable; clone to private copy; quiz attempt submission |
| `workspace-membership.spec.ts` | Invite-only workspace; exact-identifier invites visible only to recipient; notification flow; wrong-account rejection; accept flow; role management |

**Strategy**: Multi-actor tests against a real Go server + Postgres in Docker, with header-based E2E auth (no Clerk). Each run gets an isolated compose stack with random ports. Tests verify both API responses (status codes, capabilities) and UI rendering.

## Pipeline Tests — `pipeline/tests/`

```bash
cd pipeline && pytest
```

Two tiers (documented in `pipeline/tests/README.md`):

| Tier | Files | Needs | Cost |
|------|-------|-------|------|
| **Offline unit** | `test_modal_parser.py`, `test_helpers.py`, `test_ai_adapter.py`, `test_mineru_lite.py` | Nothing | Free, ~4s |
| **Cassette integration** | `test_ingest_query.py` | Live Postgres + recorded VCR cassettes | Free on replay |

### VCR Cassette System (`conftest.py`)

- **Replay** (default): No network to model APIs; cassettes must exist; dummy API keys
- **Record** (`EVO_TEST_RECORD=once`): Hits real services with real API keys; writes cassettes

Determinism enforced: serial execution (`MAX_ASYNC_LLM=1`, `EMBEDDING_FUNC_MAX_ASYNC=1`, `MAX_PARALLEL_INSERT=1`), LLM cache off, body normalization (timestamps blanked, embedding inputs sorted, KG-context records sorted). Secrets stripped from cassettes.

### Test Files

- `test_modal_parser.py` — Engine registration, raw-bundle signature, IR building from bundle (text/table/equation/image)
- `test_helpers.py` — `_extract_json()`, `_strip_fence()`, `_cognitive_levels()`, `_graph_name()`
- `test_ai_adapter.py` — Plate AI adapter prompt building, context bounding, selection limiting, untrusted content marking
- `test_mineru_lite.py` — `parse_blob()` relay + retry behavior, legacy local-path fallback (monkeypatched, no network)
- `test_ingest_query.py` — Full LightRAG pipeline: text ingest builds KG and answers queries; PDF ingest via Modal parse engine builds KG with chunks. Each test uses a unique throwaway workspace, purged on teardown.
