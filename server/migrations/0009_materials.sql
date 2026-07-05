-- Evo Notes — persisted study materials (mindmaps & diagrams).
--
-- Mindmaps and diagrams are markdown documents (with embedded ```mermaid
-- fences) generated from a scope of chapters and/or files. Unlike quizzes they
-- are not chapter-scoped in the UI; the left-panel materials list aggregates
-- these rows together with the workspace's quizzes and decks.
--
-- IDs follow the app-wide prefixed-text scheme (mat_*). Idempotent: re-runs on
-- every boot.

CREATE TABLE IF NOT EXISTS materials (
  id              text PRIMARY KEY,
  workspace_id    text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workspace_name  text NOT NULL DEFAULT '',
  kind            text NOT NULL CHECK (kind IN ('mindmap','diagram')),
  title           text NOT NULL DEFAULT '',
  content         text NOT NULL DEFAULT '',
  scope_chapters  text[] NOT NULL DEFAULT '{}',
  scope_file_ids  text[] NOT NULL DEFAULT '{}',
  privacy         text NOT NULL DEFAULT 'private',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS materials_ws_idx ON materials(workspace_id, created_at DESC);
