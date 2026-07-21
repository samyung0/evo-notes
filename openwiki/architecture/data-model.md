---
type: Data Model
title: Data Model & Entities
description: Core data entities, relationships, enums, and the universal material envelope for Evo Notes. Covers the Postgres schema, sharing/access model, and migration history.
tags: [data-model, schema, database]
---

# Data Model & Entities

All data lives in a single PostgreSQL database. The Go gateway owns business tables (users, workspaces, materials, files, etc.); LightRAG owns `lightrag_*` tables in the same database. Migrations are embedded Go files applied on startup.

## Core Entities

### User

**Source**: `server/internal/store/models.go`

| Field | Type | Notes |
|-------|------|-------|
| `ID` | string | Prefixed random ID (e.g., `u_abc123`) |
| `Name`, `Email`, `AvatarURL` | string | Synced from Clerk on auth |
| `ClassLabel` | string | User classification |
| `Streak` | int | Daily study streak |
| `PlanTier` | PlanTier | `free`, `pro`, `team` |
| `SubscriptionStatus` | SubscriptionStatus | `none`, `active`, `past_due`, `canceled`, `trialing` |

Users are lazily provisioned on first authenticated request via `UpsertUserFromClerk()`. New users get a default workspace via `CreateDefaultWorkspace()`.

### Workspace

**Source**: `server/internal/store/models.go`, `server/internal/store/queries.go`

| Field | Type | Notes |
|-------|------|-------|
| `ID` | string | |
| `Name` | string | |
| `Color` | UserColor | Palette color |
| `Privacy` | Privacy | `private`, `public`, `link` |
| `ShareRole` | ShareRole | Role for non-members on link/public access (`editor`, `commenter`, `viewer`) |
| `Tags` | []string | |
| `ChapterCount`, `FileCount` | int | Denormalized counts |
| `CreatedAt`, `LastAccessedAt` | timestamp | |
| `IsOwner`, `Role`, `Capabilities` | request-scoped | Derived per-request, not persisted |

### Material (Universal Document Envelope)

**Source**: `server/internal/store/models.go`, `server/migrations/0010_unify_materials.sql`

Migration `0010` consolidated quizzes, flashcards, mindmaps, and diagrams into a single `materials` table. This is the most important entity in the system.

| Field | Type | Notes |
|-------|------|-------|
| `ID` | string | |
| `UserID` | string | Owner |
| `WorkspaceID` | string | Parent workspace |
| `Kind` | string | `mindmap`, `diagram`, `quiz`, `flashcards`, etc. |
| `Title` | string | |
| `Content` | jsonb (Envelope) | Plate.js document envelope, deserialized via `materialdoc.Envelope` |
| `ChapterID` | *string | Filing membership (null = unfiled) |
| `ScopeChapters` | []string | Provenance — chapters this material was generated from |
| `ScopeFileIDs` | []string | Provenance — source files |
| `Privacy` | Privacy | |
| `Color` | UserColor | |
| `Revision` | int | Optimistic concurrency counter |
| `IsOwner`, `Role`, `Capabilities` | request-scoped | Derived from effective access |

**Optimistic concurrency**: All material writes must provide `ExpectedRevision`. If the stored revision differs, the gateway returns `ErrConflict` (HTTP 409). Each write creates a `MaterialRevision` row.

### MaterialRevision

| Field | Type | Notes |
|-------|------|-------|
| `MaterialID`, `Revision` | composite PK | |
| `Title`, `Content` | | Snapshot at this revision |
| `CreatedBy` | *string | |
| `CreatedAt` | timestamp | |

### File (Source)

| Field | Type | Notes |
|-------|------|-------|
| `ID` | string | |
| `WorkspaceID`, `ChapterID` | string, *string | `ChapterID` null = unfiled |
| `Name` | string | |
| `Kind` | FileKind | `pdf`, `doc`, `md`, `image`, `txt`, `sheet`, `slides`, `video`, `audio`, `json`, `unknown` |
| `SizeKb` | int | |
| `Status` | FileStatus | `processing`, `ready`, `failed` |
| `URL` | *string | B2 presigned URL |
| `Content` | *string | Inline content for text files |
| `DocID` | *string | LightRAG document ID (set after ingest) |

### Chapter

Organizes files and materials within a workspace.

| Field | Type | Notes |
|-------|------|-------|
| `ID` | string | |
| `WorkspaceID` | string | |
| `Name` | string | |
| `Order` | int | Sort order |
| `FileIDs` | []string | Files in this chapter |

### WorkspaceMember

**Source**: `server/internal/store/models.go`, `server/migrations/0016_plate_collaboration.sql`

| Field | Type | Notes |
|-------|------|-------|
| `WorkspaceID`, `UserID` | composite PK | |
| `Name`, `Email`, `AvatarURL` | string | |
| `Role` | WorkspaceRole | `owner`, `editor`, `commenter`, `viewer` |
| `CreatedAt` | timestamp | |

### WorkspaceInvite

**Source**: `server/migrations/0018_workspace_sharing_permissions.sql`

Identity-bound invitations with token-based acceptance. Migration `0018` replaced the pending-email unique index with a pending-user unique index.

| Field | Type | Notes |
|-------|------|-------|
| `ID` | string | |
| `WorkspaceID` | string | |
| `InvitedUserID` | string | Identity-bound (not just email) |
| `Email` | string | |
| `Role` | WorkspaceRole | |
| `Token` | string | |
| `InvitedBy` | string | |
| `ExpiresAt` | timestamp | |
| `AcceptedAt`, `RevokedAt` | *timestamp | |

### Collaboration Entities

**Source**: `server/migrations/0016_plate_collaboration.sql`, `server/internal/store/models.go`

#### MaterialSuggestion

| Field | Type | Notes |
|-------|------|-------|
| `ID` | string | |
| `MaterialID` | string | |
| `UserID` | string | Author of suggestion |
| `BaseRevision` | int | Anchored to a specific revision |
| `Anchor` | jsonb | Block-level position |
| `OriginalFragment` | jsonb | |
| `ProposedFragment` | jsonb | |
| `Status` | SuggestionStatus | `pending`, `accepted`, `rejected`, `withdrawn` |
| `ReviewedBy`, `ReviewedAt` | *string, *timestamp | |

Has a composite FK `(material_id, base_revision)` → `material_revisions(material_id, revision)`.

#### Discussion

Threaded discussions anchored to material blocks. Contains `Comments[]`.

#### Comment

Rich-text comments within discussions. `ContentRich` is jsonb.

### Legacy Entities (Backfilled)

Migration `0010` backfilled and dropped `quizzes`, `decks`, and `cards` tables. Per-user flashcard scheduling moved to `card_stats` with FSRS jsonb state.

| Entity | Status |
|--------|--------|
| Quiz | Backfilled into materials |
| Deck | Backfilled into materials |
| Flashcard | Backfilled; FSRS state in `card_stats` |
| Attempt | Retained (quiz attempt scoring) |

### Other Entities

| Entity | Purpose |
|--------|---------|
| `Event` | Calendar event with label associations |
| `Task` | Task list item |
| `Notification` | In-app notification (`event`, `quiz`, `system`) |
| `Canvas` | Excalidraw scene storage (jsonb) |
| `MaterialRef` | Aggregated left-panel list view across all material kinds |

## Enums

**Source**: `server/internal/store/enums.go`

All enums implement `huma.SchemaProvider` so they're emitted as named OpenAPI components, ensuring the frontend gets one TypeScript union per enum.

| Enum | Values |
|------|--------|
| `UserColor` | green, purple, blue, amber, coral, graphite, transparent |
| `Privacy` | private, public, link |
| `WorkspaceRole` | owner, editor, commenter, viewer |
| `ShareRole` | editor, commenter, viewer (excludes owner) |
| `PlanTier` | free, pro, team |
| `SubscriptionStatus` | none, active, past_due, canceled, trialing |
| `FileKind` | pdf, doc, md, image, txt, sheet, slides, video, audio, json, unknown |
| `FileStatus` | processing, ready, failed |
| `SuggestionStatus` | pending, accepted, rejected, withdrawn |
| `NotificationKind` | event, quiz, system |
| `SearchKind` | workspace, file, event, flashcards, thinking |

## Sharing & Access Model

**Source**: `server/internal/store/share.go`

This is the core authorization model. It operates in layers:

### Workspace Access (`WorkspaceAccess`)

1. **Owner** — matched via `workspaces.user_id` → full control
2. **Explicit member** — via `workspace_members` table → role-based access
3. **Link/public** — workspace `privacy` is `link` or `public` → shared read with `ShareRole`
4. **Private + non-member** → `ErrNotFound` (404 to hide existence)

### Material Effective Access (`MaterialEffectiveAccess`)

1. Direct material owner → `RoleOwner`, explicit
2. Parent workspace owner → `RoleOwner`, explicit
3. Explicit workspace member → member's role, explicit
4. Shared workspace + signed-in non-member → `share_role.WorkspaceRole()`, not explicit
5. Shared workspace + anonymous → `RoleViewer`, not explicit
6. Material-only link/public (private workspace) → `RoleViewer` (view-only)
7. Otherwise → `ErrNotFound`

### Role Hierarchy

- **Can edit**: owner or editor
- **Can comment**: can edit or commenter
- **Can manage members**: owner only

### Shared Editor Restrictions

Non-explicit (shared) editors may only replace versioned Plate content with an `ExpectedRevision`. Metadata, filing, scope, visibility, title, and deletion require explicit membership. This is enforced by `sharedMaterialPatchAllowed()` in `huma_materials.go`.

## Entity Relationships

```
User ──1:N──> Workspace (owner)
Workspace ──1:N──> Chapter
Workspace ──1:N──> File
Workspace ──1:N──> Material
Workspace ──1:N──> WorkspaceMember
Workspace ──1:N──> WorkspaceInvite
Chapter ──1:N──> File (optional; file.chapter_id nullable)
Material ──1:N──> MaterialRevision
Material ──1:N──> MaterialSuggestion
Material ──1:N──> Discussion
Discussion ──1:N──> Comment
MaterialSuggestion ──> MaterialRevision (composite FK)
```

## Migration History

| Migration | Purpose |
|-----------|---------|
| `0001_init.sql` | Core schema, pgvector, jobs queue |
| `0002_seed.sql` | Seed data |
| `0003_lightrag_age.sql` | Apache AGE extension for LightRAG graph |
| `0004_auth_billing.sql` | Auth + billing columns |
| `0005_srs_levels.sql` | Spaced repetition scheduling levels |
| `0008_chat.sql` | Chat conversations |
| `0009_materials.sql` | Initial materials table |
| `0010_unify_materials.sql` | **Major**: unify quizzes/decks/cards into materials |
| `0011_notes.sql` | Notes support |
| `0014_sharing.sql` | Workspace sharing (privacy + share_role) |
| `0015_direct_uploads.sql` | Direct B2 uploads |
| `0016_plate_collaboration.sql` | **Major**: suggestions, discussions, comments, workspace_members |
| `0017_editor_assets.sql` | Editor asset storage |
| `0018_workspace_sharing_permissions.sql` | Identity-bound invitations |

See [Backend API & Auth](../backend/api-and-auth.md) for how these entities are exposed through the HTTP API.
