-- Evo Notes — live sharing & cloning.
--
-- Visibility becomes enforceable: `privacy` on workspaces/materials now drives
-- read access (owner OR link/public) and the Explore page reads live rows
-- instead of the seeded public_* snapshot tables. clone_count tracks how many
-- times a shared workspace / material was cloned.

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS clone_count int NOT NULL DEFAULT 0;
ALTER TABLE materials  ADD COLUMN IF NOT EXISTS clone_count int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS workspaces_privacy_idx ON workspaces(privacy) WHERE privacy = 'public';
CREATE INDEX IF NOT EXISTS materials_privacy_idx  ON materials(privacy, kind) WHERE privacy = 'public';
