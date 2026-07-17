-- Evo Notes — live sharing & cloning.
--
-- Visibility becomes enforceable: `privacy` on workspaces/materials now drives
-- read access (owner OR link/public) and the Explore page reads live rows
-- instead of the seeded public_* snapshot tables. clone_count tracks how many
-- times a shared workspace / material was cloned.

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS clone_count int NOT NULL DEFAULT 0;
ALTER TABLE materials  ADD COLUMN IF NOT EXISTS clone_count int NOT NULL DEFAULT 0;

-- Materials can be truly standalone. Ownership lives directly on the
-- material; workspace_id is optional provenance/container membership.
ALTER TABLE materials ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id) ON DELETE CASCADE;
UPDATE materials m SET user_id=w.user_id
FROM workspaces w
WHERE m.workspace_id=w.id AND m.user_id IS NULL;
ALTER TABLE materials ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE materials ALTER COLUMN workspace_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS workspaces_privacy_idx ON workspaces(privacy) WHERE privacy = 'public';
CREATE INDEX IF NOT EXISTS materials_privacy_idx  ON materials(privacy, kind) WHERE privacy = 'public';
CREATE INDEX IF NOT EXISTS materials_user_idx ON materials(user_id, kind, created_at DESC);
