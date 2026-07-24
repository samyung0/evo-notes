---
type: Frontend
title: 'Frontend: Editor & UI'
description: React frontend for evo-notes — provider stack, TanStack Router, API layer (orval + hand-written client + TanStack Query hooks), Plate.js editor system, materials rendering, feature domains, design system, and MSW mocks.
tags: [frontend, react, plate-editor, routing, api, design-system]
---

# Frontend: Editor & UI

React 19 SPA built with TanStack Router, TanStack Query, Plate.js (rich text editor), Vite, Tailwind CSS, and Radix UI. The frontend consumes the Go [backend](../backend/api-and-store.md) API exclusively through `/api`.

## App Entrypoint & Providers

**`src/main.tsx`**

Provider stack (outer → inner): `ThemeProvider` → `AppAuthProvider` (Clerk or MSW pass-through) → `QueryClientProvider` (TanStack Query) → `RouterProvider` (TanStack Router). MSW mocks are enabled by default in dev (`VITE_USE_MSW`); disabling hits the Go gateway proxied at `/api`.

## Routing

**`src/router.tsx`** — Code-based routing (not file-based) with `createRootRouteWithContext<RouterContext>`.

- **Auth guard**: `AuthGate` wraps `AppShell` in the `auth-shell` layout route. When Clerk is active, signed-out users redirect to `/sign-in`. MSW mode bypasses auth.
- **Preloading**: `defaultPreload: 'intent'`, each route has a `loader` that primes React Query cache via `qc.prefetchQuery()` before the lazy component mounts.
- **Public share routes**: `/share/workspaces/$workspaceId`, `/share/quizzes/$quizId`, `/share/decks/$deckId` — bypass auth.
- **Feature-flagged routes**: `/thinking`, `/explore` — conditionally included via `src/lib/features.ts`.

### Key Route Components (`src/routes/`)

`WorkspaceOpen.tsx` (29KB — the main workspace view), `Dashboard`, `Quizzes`, `QuizAttempt`, `QuizEdit`, `Schedule`, `Flashcards`, `DeckStudy`, `Files`, `Workspaces`, `Explore`, `Thinking`, `Settings`, `Profile`, `Subscription`.

## API Layer (`src/api/`)

### HTTP Client — `client.ts`

Thin HTTP wrapper with base URL `/api`. JSON methods use `fetch`; multipart
`upload` and direct-storage `putFile` use XHR so both expose progress and abort
support. `ApiError` carries `status`/`statusText` for branching. Centralized
TanStack Query key registry (`qk`).

### Query Hooks — `hooks.ts` (~1000+ lines)

~60+ `useQuery`/`useMutation` hooks covering all domains. The
`useSourceUploadPolicy` query consumes the Huma-generated source allowlist;
`useUploadSource` carries chapter ids or new chapter names through both
multipart and direct-B2 flows. Optimistic mutations (`useMoveFile`,
`useReorderContent`) patch cache on mutate, rollback on error, reconcile on
settle.

### Types — `types.ts`

Re-exports generated wire contracts from `src/api/gen/model/` with thin UI overrides. `Material` interface adds `capabilities`, `role`, `revision`. `Question` is a discriminated union (choice/boolean/text/matching/ordering) with `CognitiveLevel`.

### SSE Streaming — `completeStream.ts` & `chatStream.ts`

Use `fetch` + `ReadableStream` reader (not `EventSource`, since POST + abort needed). Parse `data: {json}\n\n` SSE events manually. Chat events: `start` → `citations` → `token*` → `done`. Completion events: `token*` → `done` / `error`.

### Plate AI Transport — `plateAiTransport.ts`

Wraps AI SDK `DefaultChatTransport` for Plate's `useChat` integration. Strips sensitive fields (`apiKey`, `model`, `provider`) from request bodies — all AI calls go through the Go gateway → pipeline.

### Editor Assets — `editorAssets.ts`

Three-phase upload: `reserveEditorAsset` → `uploadReservedEditorAsset` (direct PUT to B2) → `completeEditorAssetUpload`. `resolveEditorAsset(assetId)` returns short-lived URL at render time. Plate documents persist `assetId`, never the URL.

### Generated Code — `src/api/gen/` (orval)

- `model/` — ~100+ TypeScript interfaces from `openapi.yaml`
- `validators.ts` — Zod validators for request/response bodies (used by form dialogs)
- `endpoints.ts` — Thin fetch functions (intentionally unused; `client.ts` + `hooks.ts` are source of truth)

**Codegen workflow**: `pnpm gen:api:msw` (one-shot: Go → openapi.yaml → orval) or `air` + `pnpm gen:api:watch` (live).

### Source upload dialog

`src/features/workspace/AddSourceDialog.tsx` no longer owns an extension
allowlist. It classifies files using the server policy, sends a new
`chapterName` with the upload instead of creating a chapter eagerly, and keeps
the confirmation dialog open while rendering byte-weighted aggregate upload
progress. Successful rows are removed after the batch settles; failed rows
remain available for retry.

## Plate.js Editor System (`src/features/notes/`)

The editor is built on [Plate.js](https://platejs.org) (v53), a Slate-based framework. It supports two modes: interactive (full editable editor with collaboration + AI) and static (read-only `PlateStatic` rendering for previews).

See [Plate.js Editor Deep Dive](plate-editor.md) for the full Plate/Slate mental model, provider and plugin lifecycle, persisted document boundary, editable/static parity, revision-based collaboration, AI transport, media, serialization, and extension checklist.

### NoteEditor — `NoteEditor.tsx`

Component hierarchy: `NoteEditor` (loads material, checks mode/capabilities) → `CollaborativeNoteEditor` (loads members, discussions; creates `EditorRuntimeProvider` context) → `NoteEditorCore` (builds Plate editor, manages save state).

- **Autosave**: 5-second debounce. Tracks `saveState` (`saved | pending | saving | error`). Uses `expectedRevision` for optimistic concurrency — on conflict (409), sets error state.
- **Suggestion mode**: Edits become suggestions (not direct saves) — go through the collaboration workflow.
- **Discussion marks**: Applied to text nodes at each discussion's anchor on mount.

### Plugins — `plugins.ts`

`buildPlugins()` assembles the full registry:

- **Base nodes**: Paragraph, H1-H6, Blockquote, HR, Bold, Italic, Underline, Code, Strikethrough, Highlight, IndentList, Link, CodeBlock (~35 languages), Table, TOC
- **Media**: Image, Video, Audio, File, Placeholder
- **Rich blocks**: Callout, Columns, Equations (inline + block, `$`/`$$` markdown), Mentions, FontColor/Size/Family, TextAlign
- **Collaboration**: discussionPlugin, commentPlugin (mod+shift+m), suggestionPlugin
- **AI**: AIChatPlugin, AIPlugin, CopilotPlugin (conditional on `allowExternalAssets`)
- **Custom blocks**: Quiz, Flashcards, Mermaid diagram elements (in `blocks/`)
- **Slash command**: SlashPlugin + SlashInputPlugin (disabled in code blocks)
- **Autoformat**: Text substitution (`->` → `→`, smart quotes, fractions)
- **DnD**: Block drag-and-drop with file drop support (HTML5Backend)
- **Save**: mod+s triggers flush

### Collaboration — `Collaboration.tsx`

`CollaborationProvider` manages base/current document snapshots, revision tracking, and suggestion dirty state. It uses Plate's comment/suggestion rendering but persists discussions and suggestions through the application API; this is revision-based optimistic concurrency, not realtime CRDT editing. `SuggestionLeaf` renders `<ins>`/`<del>` with tinted backgrounds. Hooks: `useCreateMaterialDiscussion`, `useCreateMaterialSuggestion`, `useUpdateMaterialSuggestionStatus`.

### Blocks Subdirectory — `blocks/`

Custom Plate plugins and components for embedded study blocks: `QuizElementPlugin`, `FlashcardsElementPlugin`, `MermaidElementPlugin`. Dialog editors (`QuizDialog`, `FlashcardsDialog`) for configuring blocks from the slash menu.

### AI — `ai/`

- `PlateAi.tsx` — `buildAiPlugins()` wires AI SDK `useChat` to Plate. AI tools: `comment`, `edit`, `generate`.
- `AiMenu.tsx` — Floating menu: Continue writing, Improve writing, Fix grammar, Make shorter/longer, Simplify.
- `VoiceButton.tsx` + `useVoiceInput.ts` — Voice-to-text for AI prompts.

## Materials System (`src/features/materials/`)

### Document Model — `document.ts`

Versioned `MaterialDocument` (`schemaVersion: 1`) wrapping `MaterialValue` (array of `MaterialElement`). Custom element types for quiz questions, flashcard faces, and mermaid diagrams. Validation functions enforce structural integrity (IDs, question types, cognitive levels, flashcard face ordering). Conversion functions bridge markdown fence blocks ↔ Plate element trees.

### Mode Policy — `modePolicy.ts`

`MaterialMode = 'view' | 'study' | 'edit' | 'suggestion'`. `materialModePolicy(kind, capabilities)` returns available modes and default based on kind and access capabilities. Quizzes/flashcards default to `study`; notes default to `edit`/`suggestion` based on role.

### CenterContent — `CenterContent.tsx`

The workspace center pane dispatcher:

- Renders `Header` (icon, title, material mode selector, editor status)
- `MaterialBody` — resolves mode via policy → `MaterialPreview` (view), `MaterialStudyView` (study), or lazy-loaded `NoteEditor` (edit/suggestion, Suspense-wrapped)
- `FileBody` — delegates to `FileViewer`

### Static Rendering — `staticNodeComponents.tsx` + `staticPlugins.ts`

Hook-free `SlateElement`/`SlateLeaf` components for `PlateStatic` (no editor store, no transforms). Shares CSS classes with editable components via `nodeStyles.ts`. Used for previews and public share views.

## Other Feature Domains

| Feature        | Key Files                  | Summary                                                                                                                                            |
| -------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workspace**  | `src/features/workspace/`  | RAG chat panel, AI generation tiles, source upload/import, chapter move                                                                            |
| **Files**      | `src/features/files/`      | File viewer dispatcher: PDF (react-pdf), Image (pan/zoom), Spreadsheet (SheetJS, ≤500×50), Docx (docx-preview)                                     |
| **Quizzes**    | `src/features/quizzes/`    | `QuestionRunner` (7 question types, review mode with tints), `QuizForm` (react-hook-form + useFieldArray), `grade.ts` (Levenshtein fuzzy matching) |
| **Schedule**   | `src/features/schedule/`   | Week/day time grid, month view, dashboard strip, event/label dialogs                                                                               |
| **Workspaces** | `src/features/workspaces/` | Create/edit form dialogs using react-hook-form + generated Zod validators                                                                          |

## Design System (`src/components/ui/`)

35+ components exported via `index.ts`. Built on **Radix UI** primitives + **class-variance-authority** (cva) for variants + **Tailwind CSS** for styling. Key components: `Button` (8 variants, 3 sizes, `asChild` slot), `Icon` (self-contained SVG set, ~40+ icons), `Dialog`, `Select`, `Popover`, `DropdownMenu`, `Tabs`, `ColorPicker`, `TagSelect`, `Sonner` (toasts), `feedback.tsx` (Skeleton, Spinner, EmptyState).

## App Shell (`src/components/app/`)

- **`AppShell.tsx`** — Flex layout: Sidebar (hidden on workspace-open routes) + main Outlet + GlobalDialogs
- **`AuthProvider.tsx`** — Clerk integration: `AppAuthProvider`, `AuthTokenBridge` (injects `getToken` into API), `AuthGate`
- **`Sidebar.tsx`** — Navigation with feature-flagged items, `preload="intent"` links
- **`GlobalDialogs.tsx`** — Centralized dialog renderer driven by Zustand `useDialogs` store
- **`TopInsetBar.tsx`** — Top bar with global search dialog
- **`ShareDialog.tsx`** — Workspace sharing (privacy, role, link)
- **`WorkspaceMemberManager.tsx`** — Member invite/role management

## Mocks (MSW) — `src/mocks/`

- **`db.ts`** (32K) — In-memory mock database seeded with dummy data for all domains. SRS state via `ts-fsrs`.
- **`handlers.ts`** (66K) — MSW handlers for all API endpoints. Simulates latency. Full CRUD for every domain.

Enabled by default in dev (`VITE_USE_MSW=true`). Set `VITE_USE_MSW=false` to proxy to the real Go server.
