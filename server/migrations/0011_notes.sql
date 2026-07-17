-- Evo Notes — add the user-authored `note` material kind.
--
-- Notes are full Plate JSON documents written in the Plate editor. They live in
-- the unified `materials` table alongside generated artifacts and, unlike
-- mindmaps/diagrams, are editable after creation (PATCH /api/materials/{id}).

ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_kind_check;
ALTER TABLE materials ADD CONSTRAINT materials_kind_check
  CHECK (kind IN ('mindmap','diagram','quiz','flashcards','note'));
