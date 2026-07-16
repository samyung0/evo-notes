-- Evo Notes — file study materials under a chapter (membership).
--
-- `materials.scope_chapters` records provenance (what a generated artifact was
-- built from) as a name snapshot. This adds an orthogonal *membership* link:
-- which chapter the material is filed under in the workspace tree — mirroring
-- `files.chapter_id`. Nullable = unfiled; ON DELETE SET NULL unfiles on chapter
-- delete (same product rule as files). Idempotent.

ALTER TABLE materials ADD COLUMN IF NOT EXISTS chapter_id text REFERENCES chapters(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS materials_chapter_idx ON materials(chapter_id);
