-- Persist one mixed order for source files and generated materials in each
-- chapter (and in the unfiled "Others" bucket).
ALTER TABLE files
  ADD COLUMN IF NOT EXISTS position bigint;

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS position bigint;

WITH ranked AS (
  SELECT id, item_type,
    row_number() OVER (
      PARTITION BY workspace_id, chapter_id
      ORDER BY item_type, created_at DESC, id
    ) - 1 AS position
  FROM (
    SELECT id, workspace_id, chapter_id, 'file' AS item_type, added_at AS created_at
    FROM files
    UNION ALL
    SELECT id, workspace_id, chapter_id, 'material' AS item_type, created_at
    FROM materials
  ) content
)
UPDATE files f
SET position = ranked.position
FROM ranked
WHERE ranked.item_type = 'file' AND ranked.id = f.id AND f.position IS NULL;

WITH ranked AS (
  SELECT id, item_type,
    row_number() OVER (
      PARTITION BY workspace_id, chapter_id
      ORDER BY item_type, created_at DESC, id
    ) - 1 AS position
  FROM (
    SELECT id, workspace_id, chapter_id, 'file' AS item_type, added_at AS created_at
    FROM files
    UNION ALL
    SELECT id, workspace_id, chapter_id, 'material' AS item_type, created_at
    FROM materials
  ) content
)
UPDATE materials m
SET position = ranked.position
FROM ranked
WHERE ranked.item_type = 'material' AND ranked.id = m.id AND m.position IS NULL;

ALTER TABLE files
  ALTER COLUMN position SET DEFAULT
    (floor(extract(epoch FROM clock_timestamp()) * 1000000)::bigint),
  ALTER COLUMN position SET NOT NULL;

ALTER TABLE materials
  ALTER COLUMN position SET DEFAULT
    (floor(extract(epoch FROM clock_timestamp()) * 1000000)::bigint),
  ALTER COLUMN position SET NOT NULL;

CREATE INDEX IF NOT EXISTS files_chapter_position_idx
  ON files(workspace_id, chapter_id, position);
CREATE INDEX IF NOT EXISTS materials_chapter_position_idx
  ON materials(workspace_id, chapter_id, position);
