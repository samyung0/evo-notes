---
type: Testing
title: Testing & E2E
description: Testing strategy for Evo Notes. Covers Playwright e2e framework, test users and roles, workspace sharing/access tests, and Vitest unit tests.
tags: [testing, e2e, playwright, vitest]
---

# Testing & E2E

Evo Notes has two test layers: Vitest for frontend unit/integration tests and Playwright for end-to-end tests against a disposable Docker stack.

## Vitest (Unit/Integration)

**Source**: `package.json` (scripts), `src/` (test files)

```bash
pnpm test          # Run all src/ tests
pnpm test -- --watch  # Watch mode
```

Test files are colocated with source files using `*.test.ts` / `*.test.tsx` naming. Key test files:

| Test File | Tests |
|-----------|-------|
| `src/features/materials/modePolicy.test.ts` | Material access mode resolution |
| `src/features/materials/staticNodeComponents.test.tsx` | Static editor node rendering |
| `src/features/notes/Collaboration.test.tsx` | Collaboration UI behavior |
| `src/features/notes/editorMode.test.ts` | Editor mode switching |
| `src/features/notes/insertEditorNode.test.ts` | Editor node insertion |
| `src/features/notes/noteEditorPrefs.test.ts` | Editor preferences |
| `src/features/notes/responsiveToolbar.test.ts` | Toolbar responsive behavior |
| `src/features/notes/suggestions.test.ts` | Suggestion handling |
| `src/features/notes/media.test.ts` | Media node handling |
| `src/features/notes/markdown.test.ts` | Markdown serialization |
| `src/features/quizzes/QuizForm.test.ts` | Quiz form validation |
| `src/features/workspace/access.test.ts` | Workspace access utilities |
| `src/features/materials/document.test.ts` | Document adapter |
| `src/api/plateAiTransport.test.ts` | Plate AI transport |

Backend Go tests:

| Test File | Tests |
|-----------|-------|
| `server/internal/httpapi/share_access_test.go` | Share access enforcement |
| `server/internal/httpapi/huma_collaboration_test.go` | Collaboration API |
| `server/internal/httpapi/ai_plate_test.go` | AI plate endpoint |
| `server/internal/httpapi/editor_assets_test.go` | Editor asset upload/resolve |
| `server/internal/httpapi/webhooks_test.go` | Webhook handlers |
| `server/internal/store/share_test.go` | Share store logic |
| `server/internal/store/share_access_test.go` | Share access queries |
| `server/internal/store/contracts_test.go` | Store contract tests |
| `server/internal/store/workspace_sharing_test.go` | Workspace sharing |
| `server/internal/auth/middleware_test.go` | Auth middleware |
| `server/internal/blob/blob_test.go` | Blob store |
| `server/internal/materialdoc/document_test.go` | Material document envelope |

Pipeline Python tests:

| Test File | Tests |
|-----------|-------|
| `pipeline/tests/test_ingest_query.py` | Ingest + query flow (VCR cassettes) |
| `pipeline/tests/test_modal_parser.py` | Modal parser client |
| `pipeline/tests/test_mineru_lite.py` | MinerU Lite client |
| `pipeline/tests/test_helpers.py` | Helper utilities |
| `pipeline/tests/test_ai_adapter.py` | AI adapter |

Pipeline tests use VCR cassettes (`pipeline/tests/cassettes/`) to record and replay LLM/embedding/VLM/Modal HTTP calls for deterministic test runs.

## Playwright E2E

**Source**: `playwright.config.ts`, `e2e/`

### Configuration

- **Browser**: Chromium only
- **Test directory**: `./e2e`
- **Parallelism**: `fullyParallel: true`; 2 workers on CI, unlimited locally
- **Timeouts**: 60s per test, 10s for expects
- **CI behavior**: `forbidOnly` on CI, 1 retry on CI, 0 locally
- **Reporting**: List + HTML
- **Tracing**: `on-first-retry`; screenshots `only-on-failure`; video `retain-on-failure`

### Infrastructure

**Source**: `e2e/global-setup.ts`, `e2e/global-teardown.ts`

- `globalSetup` spins up a Vite dev server with MSW disabled, Clerk disabled, feature flags enabled
- Random port allocation (20,000–45,000) with env overrides
- Compose project name randomized per PID to avoid collisions
- E2E auth via shared secret + user ID headers (no real Clerk)
- A disposable Docker stack (`deploy/docker-compose.e2e.yml`) provides Postgres + Go gateway with in-memory blob storage

### Test Users

**Source**: `e2e/fixtures/seed.ts`

Five test users with distinct roles for access-control testing:

| User | ID | Role |
|------|----|------|
| owner | `u_owner` | Workspace owner |
| editor | `u_editor` | Explicit editor member |
| commenter | `u_commenter` | Explicit commenter member |
| viewer | `u_viewer` | Explicit viewer member |
| other | `u_other` | Non-member |

Auth helper: `e2eHeaders(userId)` injects `X-E2E-User-Id` + `X-E2E-Secret` headers.

### Seed Workspaces

**Source**: `e2e/fixtures/seed.ts`, `e2e/fixtures/seed.sql`

Six workspace types for access-control testing:

| Workspace | Privacy | Purpose |
|-----------|---------|---------|
| `privateWorkspace` | private | Secret title + secret file, 404 for non-members |
| `linkWorkspace` | link | Shared via link |
| `publicWorkspace` | public | Publicly accessible |
| `editableWorkspace` | link (share_role=editor) | Editable via shared link |
| `inviteWorkspace` | invite | Invite-only |
| `mutateWorkspace` | — | For mutation tests |

Also seeds quizzes, flashcard decks, and notes across workspaces for permission-scoped content verification.

### Actor Fixture

**Source**: `e2e/fixtures/actors.ts`

Provides per-role Playwright pages: `ownerPage`, `editorPage`, `viewerPage`, `commenterPage`, `otherPage`, `anonymousPage`.

### E2E Test Coverage

**Source**: `e2e/sharing/`

| Spec File | Coverage |
|-----------|---------|
| `workspace-sharing.spec.ts` | Owner/editor/viewer/non-member/anonymous access; private→link sharing switch |
| `workspace-membership.spec.ts` | Member list, invite, update role, remove |
| `material-modes.spec.ts` | Material access modes (edit/suggestion/view) per role |
| `deck-sharing.spec.ts` | Flashcard deck sharing access |
| `quiz-sharing.spec.ts` | Quiz sharing access |

### E2E Helpers

**Source**: `e2e/helpers/workspace.ts`, `e2e/helpers/api.ts`

- `openWorkspaceMaterial(page, workspaceId, materialId, shared)` — navigates to workspace with material query param
- API response interception (`waitForApi` / `apiEndsWith`) for HTTP status + body assertions alongside UI assertions

### Running E2E Tests

```bash
pnpm e2e:install     # Install Chromium
pnpm e2e             # Run all e2e tests
pnpm e2e:ui          # Interactive Playwright UI mode
```

## Test Strategy Notes

- E2E tests verify the [sharing/access model](../backend/api-and-auth.md#sharing--access-control) end-to-end through both UI and API assertions
- The disposable Docker stack ensures tests are isolated and repeatable
- Pipeline tests use VCR cassettes to avoid real LLM API calls while testing the full RAG flow
- Backend tests focus on access control (`share_access_test.go`, `workspace_sharing_test.go`) and collaboration contracts (`contracts_test.go`)

## Source References

| Component | Source File |
|-----------|-------------|
| Playwright config | `playwright.config.ts` |
| E2E seed | `e2e/fixtures/seed.ts`, `e2e/fixtures/seed.sql` |
| E2E actors | `e2e/fixtures/actors.ts` |
| E2E helpers | `e2e/helpers/workspace.ts`, `e2e/helpers/api.ts` |
| E2E sharing tests | `e2e/sharing/*.spec.ts` |
| Global setup | `e2e/global-setup.ts` |
| Global teardown | `e2e/global-teardown.ts` |
| E2E compose | `deploy/docker-compose.e2e.yml` |
| E2E env example | `e2e/.env.example` |
