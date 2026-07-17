-- Plate documents, optimistic revisions, workspace membership, and comments.
-- This migration intentionally targets the rewritten jsonb material schema;
-- compatibility with databases created from the old markdown schema is not
-- supported.

ALTER TABLE materials ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 1;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE materials ADD COLUMN IF NOT EXISTS updated_by text REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS material_revisions (
  material_id text NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  revision    bigint NOT NULL,
  title       text NOT NULL,
  content     jsonb NOT NULL,
  created_by  text REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (material_id, revision)
);
CREATE INDEX IF NOT EXISTS material_revisions_created_idx
  ON material_revisions(material_id, created_at DESC);

INSERT INTO material_revisions (material_id, revision, title, content, created_by, created_at)
SELECT id, revision, title, content, user_id, created_at
FROM materials
ON CONFLICT (material_id, revision) DO NOTHING;

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('owner','editor','commenter','viewer')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS workspace_members_user_idx
  ON workspace_members(user_id, workspace_id);

INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT id, user_id, 'owner'
FROM workspaces
WHERE user_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role='owner';

CREATE TABLE IF NOT EXISTS workspace_invites (
  id            text PRIMARY KEY,
  workspace_id  text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email         text NOT NULL,
  role          text NOT NULL CHECK (role IN ('editor','commenter','viewer')),
  token_hash    bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
  invited_by    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accepted_by   text REFERENCES users(id) ON DELETE SET NULL,
  expires_at    timestamptz NOT NULL,
  accepted_at   timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_invites_pending_email_idx
  ON workspace_invites(workspace_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS material_discussions (
  id               text PRIMARY KEY,
  material_id      text NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  block_id         text,
  document_content text,
  anchor           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by       text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_resolved      boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS material_discussions_material_idx
  ON material_discussions(material_id, created_at);

CREATE TABLE IF NOT EXISTS material_comments (
  id            text PRIMARY KEY,
  discussion_id text NOT NULL REFERENCES material_discussions(id) ON DELETE CASCADE,
  user_id       text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_rich  jsonb NOT NULL,
  is_edited     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS material_comments_discussion_idx
  ON material_comments(discussion_id, created_at);

CREATE TABLE IF NOT EXISTS material_suggestions (
  id                text PRIMARY KEY,
  material_id       text NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  user_id           text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_revision     bigint NOT NULL,
  anchor            jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(anchor) = 'object'),
  original_fragment jsonb NOT NULL CHECK (jsonb_typeof(original_fragment) = 'array'),
  proposed_fragment jsonb NOT NULL CHECK (jsonb_typeof(proposed_fragment) = 'array'),
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  reviewed_by       text REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (material_id, base_revision)
    REFERENCES material_revisions(material_id, revision) ON DELETE CASCADE,
  CHECK (
    (status IN ('accepted','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    OR
    (status IN ('pending','withdrawn') AND reviewed_by IS NULL AND reviewed_at IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS material_suggestions_material_idx
  ON material_suggestions(material_id, status, created_at);
CREATE INDEX IF NOT EXISTS material_suggestions_author_idx
  ON material_suggestions(user_id, created_at);
