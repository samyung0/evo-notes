ALTER TABLE upload_sessions
  ADD COLUMN IF NOT EXISTS chapter_name text;

UPDATE upload_sessions
SET chapter_name = ''
WHERE chapter_name IS NULL;

ALTER TABLE upload_sessions
  ALTER COLUMN chapter_name SET DEFAULT '',
  ALTER COLUMN chapter_name SET NOT NULL;
