---
type: Frontend
title: Frontend Editor & UI
description: React frontend architecture for Evo Notes. Covers app bootstrap, routing, API hooks, Plate.js editor, real-time collaboration, material access modes, AI chat, state management, and MSW mocking.
tags: [frontend, react, editor, platejs, ui]
---

# Frontend Editor & UI

The frontend is a React 19 SPA built with Vite. It uses TanStack Router for routing, TanStack Query for server state, Plate.js v53 for the rich text editor, and Zustand for local UI state. MSW provides full API mocking for development.

## App Bootstrap

**Source**: `src/main.tsx`

The provider stack (outermost → innermost):

1. **ClerkProvider** — Clerk auth (skipped when `VITE_USE_MSW=true`)
2. **QueryClientProvider** — TanStack Query (server state)
3. **RouterProvider** — TanStack Router (route tree)
4. **MSW** — Mock Service Worker, enabled by default in dev, intercepts all `/api` calls

When MSW is on, the app works fully standalone with mock data. When off, Vite proxies `/api` → `VITE_API_URL` (default `http://localhost:8080`).

## Routing

**Source**: `src/router.tsx`

Uses TanStack Router with file-less config. Routes are lazy-loaded with React Query prefetch loaders. Key routes:

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `Dashboard` | Home dashboard |
| `/workspaces` | `Workspaces` | Workspace list |
| `/workspaces/{id}` | `WorkspaceOpen` | Main workspace view (files, materials, editor, chat) |
| `/share/workspaces/{id}` | `WorkspaceOpen` (shared variant) | Public/link-shared workspace view |
| `/flashcards` | `Flashcards` | Spaced repetition |
| `/quizzes` | `Quizzes` | Quiz list |
| `/quiz/{id}/attempt` | `QuizAttempt` | Quiz runner |
| `/deck/{id}/study` | `DeckStudy` | Flashcard study |
| `/schedule` | `Schedule` | Calendar |
| `/explore` | `Explore` | Public content feed |

## API Client & Hooks

**Source**: `src/api/client.ts`, `src/api/hooks.ts`, `orval.config.ts`

The API contract is code-generated from the Go server's OpenAPI spec:

1. `pnpm gen:openapi` — Go server emits `openapi.yaml`
2. `pnpm gen:api` — orval generates TypeScript types, Zod validators, and TanStack Query hooks into `src/api/gen/`

The hand-written `src/api/client.ts` is a thin fetch wrapper. `src/api/hooks.ts` provides domain-specific query/mutation hooks. `src/api/types.ts` re-exports and extends generated types.

Generated files should not be hand-edited — they are overwritten on regeneration.

## Auth Flow

**Source**: `src/components/app/AuthProvider.tsx`

- Uses `@clerk/react` for authentication
- On identity change (sign-in/sign-out), the query cache is cleared and the router reloads to ensure stale data is purged
- When MSW is enabled, Clerk is bypassed (mock identity)
- Auth tokens flow to the Go gateway as Bearer tokens

## Plate.js Editor

**Source**: `src/features/notes/NoteEditor.tsx`, `src/features/notes/plugins.ts`, `src/features/notes/editorCommands.ts`

The editor is built on **Plate.js v53** with ~30+ plugins. Key components:

- **NoteEditor** — Main editor component, orchestrates plugins, value, and onChange
- **NoteToolbar** — Formatting toolbar (responsive, see `responsiveToolbar.ts`)
- **FloatingToolbar** / **LinkFloatingToolbar** — Context-aware floating toolbars
- **SlashInput** — Slash command combobox
- **MentionInput** — @-mention combobox
- **plugins.ts** — Plugin registration (basic nodes, lists, tables, media, code blocks, math, etc.)
- **editorCommands.ts** — Programmatic editor operations (insert nodes, toggle marks)
- **nodeComponents.tsx** — Custom node renderers
- **nodeStyles.ts** — Node-level styling
- **documentAdapters.ts** — Markdown/serialization adapters

### Editor Modes

**Source**: `src/features/notes/editorMode.ts`, `src/features/notes/insertEditorNode.ts`

The editor supports different modes based on the material's access capabilities. The mode determines which editing actions are available (full edit, suggestion-only, view-only).

### AI Integration in Editor

**Source**: `src/features/notes/ai/PlateAi.tsx`, `src/features/notes/ai/AiMenu.tsx`

- AI menu accessible via slash command or toolbar
- Streaming completions via `/api/workspaces/{id}/complete/stream` (SSE)
- Voice input via Whisper transcription (`useVoiceInput.ts`)

## Collaboration

**Source**: `src/features/notes/Collaboration.tsx`, `src/features/materials/modePolicy.ts`

Three collaboration primitives built on the backend collaboration API:

1. **Suggestions** — Proposed content changes with accept/reject/withdraw lifecycle. Anchored to material revisions.
2. **Discussions** — Threaded discussions anchored to specific editor blocks.
3. **Comments** — Rich-text comments within discussions.

### Material Access Modes (modePolicy)

**Source**: `src/features/materials/modePolicy.ts`

The `modePolicy` module resolves the user's effective capabilities (from the API response's `Capabilities` field) into UI policy decisions:

- **Can edit** → full editing mode
- **Can comment** → suggestion mode (propose changes, can't directly edit)
- **View only** → read-only rendering

This policy is also tested in `src/features/materials/modePolicy.test.ts`.

### Static Rendering

**Source**: `src/features/materials/staticNodeComponents.tsx`, `src/features/materials/staticPlugins.ts`

For read-only contexts (shared workspaces, previews), the editor uses "static" node components and plugins that don't include editing/dnd functionality. This is used in `StudyBlockViews.tsx` for rendering study materials.

## AI Chat

**Source**: `src/features/workspace/ChatPanel.tsx`, `src/features/workspace/useChatStream.ts`

- Conversations persisted via `/api/workspaces/{id}/chat` (sync) and `/api/workspaces/{id}/chat/stream` (SSE)
- Uses `streamdown` for markdown rendering of streamed responses
- Citations rendered with source references
- Material generation via `/api/workspaces/{id}/generate`

## State Management

Three layers:

1. **TanStack Query** — Server state (workspaces, materials, files, etc.). Prefetched in route loaders.
2. **Zustand** — Local UI state (`src/stores/dialogs.ts`, `src/stores/defaultValues.ts`)
3. **Plate.js** — Editor state (internal to the editor instance)

## UI Component Library

**Source**: `src/components/ui/`

Custom component library built on Radix UI primitives and CVA (class-variance-authority):

- `Button`, `IconButton`, `Input`, `TextArea`, `Select`, `Checkbox`
- `Dialog`, `Drawer`, `Popover`, `DropdownMenu`
- `Card`, `Badge`, `TagSelect`, `WorkspaceCard`
- `Icon` (lucide-react), `ColorPicker`, `UserColorChooser`
- `Resizable` (react-resizable-panels)
- `Sonner` (toasts)
- `ProgressBar`, `SegmentedControl`, `Tabs`, `HoverActions`

## i18n

**Source**: `src/i18n/`, `messages/en.json`, `messages/zh.json`

Uses Paraglide (compile-time i18n). Messages defined in `messages/{lang}.json`. Translations compiled via `@inlang/paraglide-js`. Some text may be missed (see `todo` line 9).

## MSW Mocking

**Source**: `src/mocks/handlers.ts`, `src/mocks/db.ts`

- MSW enabled by default in development (`VITE_USE_MSW=true`)
- `src/mocks/db.ts` — In-memory mock database
- `src/mocks/handlers.ts` — Mock API handlers mirroring the Go gateway's contract
- The mock DB and handlers should stay in sync with the real API contract (which is the OpenAPI spec)

## Workspace Management UI

**Source**: `src/features/workspaces/WorkspaceFormCreateDialog.tsx`, `src/features/workspaces/WorkspaceFormEditDialog.tsx`, `src/components/app/ShareDialog.tsx`, `src/components/app/WorkspaceMemberManager.tsx`

- Create/edit workspace dialogs (react-hook-form + zod)
- Share dialog — manage privacy (private/link/public) and share role
- Workspace member manager — list, invite, update, remove members

## Source References

| Component | Source File |
|-----------|-------------|
| App entry | `src/main.tsx` |
| Routing | `src/router.tsx` |
| API client | `src/api/client.ts` |
| API hooks | `src/api/hooks.ts` |
| Generated types | `src/api/gen/` |
| Orval config | `orval.config.ts` |
| Vite config | `vite.config.ts` |
| Auth provider | `src/components/app/AuthProvider.tsx` |
| App shell | `src/components/app/AppShell.tsx` |
| Editor | `src/features/notes/NoteEditor.tsx` |
| Plugins | `src/features/notes/plugins.ts` |
| Collaboration | `src/features/notes/Collaboration.tsx` |
| Mode policy | `src/features/materials/modePolicy.ts` |
| Chat | `src/features/workspace/ChatPanel.tsx` |
| Mock handlers | `src/mocks/handlers.ts` |
| Mock DB | `src/mocks/db.ts` |
| UI components | `src/components/ui/` |
