-- Restructure tags into a reusable catalog + entity link table.
--
-- Before: `tags` was per-entity — one row per (kind, entity_id, name), so the
-- same tag on two workspaces was two rows with two metadata blobs, and editing
-- an entity deleted+reinserted its rows (losing metadata / created_at).
--
-- After: `tags` is a per-user, per-kind catalog (deduped by name); `entity_tags`
-- links workspaces/quizzes/cards to catalog tags. Reusing a tag references the
-- same catalog row, so per-tag metadata (future analytics: search/click/traffic)
-- survives edits and outlives the entities that reference it.
--
-- Idempotent: the whole file re-runs on every boot. The destructive reshape is
-- guarded on the presence of the legacy `entity_id` column.

CREATE TABLE IF NOT EXISTS entity_tags (
  kind       text NOT NULL,               -- 'workspace' | 'quiz' | 'card'
  entity_id  text NOT NULL,               -- id of the owning workspace/quiz/card
  tag_id     text NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, entity_id, tag_id)
);
CREATE INDEX IF NOT EXISTS entity_tags_entity_idx ON entity_tags(kind, entity_id);
CREATE INDEX IF NOT EXISTS entity_tags_tag_idx ON entity_tags(tag_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'entity_id'
  ) THEN
    -- Link each legacy per-entity tag to the canonical catalog row for its
    -- (user, kind, name) group (keeper = lowest id). ON CONFLICT collapses any
    -- case-only duplicates a single entity might have had.
    INSERT INTO entity_tags (kind, entity_id, tag_id)
      SELECT t.kind, t.entity_id, k.keeper
      FROM tags t
      JOIN (
        SELECT id,
               first_value(id) OVER (
                 PARTITION BY user_id, kind, lower(name) ORDER BY id
               ) AS keeper
        FROM tags
      ) k ON k.id = t.id
      ON CONFLICT DO NOTHING;

    -- Drop non-keeper duplicates (their links were already repointed above).
    DELETE FROM tags WHERE id IN (
      SELECT id FROM (
        SELECT id, row_number() OVER (
                 PARTITION BY user_id, kind, lower(name) ORDER BY id
               ) AS rn
        FROM tags
      ) d WHERE d.rn > 1
    );

    ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_kind_entity_id_name_key;
    ALTER TABLE tags DROP COLUMN entity_id;
  END IF;
END $$;

-- Catalog uniqueness: one tag name per user per kind (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS tags_user_kind_name_uidx
  ON tags(user_id, kind, lower(name));

-- Re-seed the demo tags in catalog form. Idempotent and id-agnostic: conflicts
-- resolve on the catalog's (user, kind, name) uniqueness (a tag already present
-- under a different id is left untouched), and links resolve the tag id by name
-- so they never dangle regardless of which id won the catalog.
INSERT INTO tags (id, user_id, kind, name) VALUES
  ('tag_1', 'u_1', 'workspace', 'Cells'),
  ('tag_2', 'u_1', 'workspace', 'Genetics'),
  ('tag_3', 'u_1', 'workspace', 'Integrals'),
  ('tag_4', 'u_1', 'workspace', 'Series'),
  ('tag_5', 'u_1', 'workspace', 'Modern'),
  ('tag_6', 'u_1', 'workspace', 'Essays'),
  ('tag_7', 'u_1', 'workspace', 'Reactions'),
  ('tag_8', 'u_1', 'workspace', 'Poetry'),
  ('tag_9', 'u_1', 'workspace', 'Shakespeare')
ON CONFLICT (user_id, kind, lower(name)) DO NOTHING;

INSERT INTO entity_tags (kind, entity_id, tag_id)
  SELECT 'workspace', v.entity_id, t.id
  FROM (VALUES
    ('ws_bio',  'Cells'),
    ('ws_bio',  'Genetics'),
    ('ws_calc', 'Integrals'),
    ('ws_calc', 'Series'),
    ('ws_hist', 'Modern'),
    ('ws_hist', 'Essays'),
    ('ws_chem', 'Reactions'),
    ('ws_eng',  'Poetry'),
    ('ws_eng',  'Shakespeare')
  ) AS v(entity_id, name)
  JOIN tags t ON t.user_id = 'u_1' AND t.kind = 'workspace' AND lower(t.name) = lower(v.name)
  WHERE EXISTS (SELECT 1 FROM workspaces w WHERE w.id = v.entity_id)
  ON CONFLICT DO NOTHING;
