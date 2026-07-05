-- Evo Notes — AI chat persistence (conversations + messages).
-- Conversations are workspace-scoped: RAG grounding runs against the owning
-- workspace's per-tenant LightRAG index, so every conversation carries both the
-- user_id (ownership) and workspace_id (retrieval scope).
--
-- IDs follow the app-wide prefixed-text scheme (conv_*, m_*) rather than UUIDs,
-- matching the rest of the schema and the frontend id conventions.

CREATE TABLE IF NOT EXISTS conversations (
  id           text PRIMARY KEY,
  user_id      text NOT NULL,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title        text,
  metadata     jsonb NOT NULL DEFAULT '{}',   -- system prompt, RAG filters, etc.
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_ws_idx ON conversations(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS conversations_user_idx ON conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id              text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user','assistant','system')),
  content         text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'complete', -- streaming | complete | aborted | error
  token_count     int,
  metadata        jsonb NOT NULL DEFAULT '{}',       -- RAG citations, generation_id, usage
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conv_idx ON messages(conversation_id, created_at);

-- Boot cleanup: migrations run (idempotently) on every server start, so any
-- assistant message still marked 'streaming' is orphaned from a crashed/killed
-- stream. Mark them 'aborted' so history loads never surface a stuck bubble.
UPDATE messages SET status='aborted' WHERE status='streaming';
