-- Evo Notes — unify all generated study artifacts into markdown `materials`.
--
-- Quizzes and flashcards used to live in their own relational tables. They now
-- become markdown documents in `materials`, with the structured payload embedded
-- in a custom fenced block (```quiz / ```flashcards). Per-user scheduling and
-- scoring state moves to `card_stats` (FSRS) and `attempts.user_id`; the mistakes
-- pool is unchanged.
--
-- The legacy tables are recreated + reseeded by 0001/0002 on every boot, so this
-- migration backfills them into `materials` (idempotent via ON CONFLICT) and then
-- drops them, leaving `materials` as the single runtime source of truth. JSON is
-- valid YAML, so the JSON payload written here parses identically to the clean
-- YAML the app emits on the next edit.

-- ---- schema -------------------------------------------------------------

ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_kind_check;
ALTER TABLE materials ADD CONSTRAINT materials_kind_check
  CHECK (kind IN ('mindmap','diagram','quiz','flashcards'));

ALTER TABLE materials ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'green';

ALTER TABLE attempts ADD COLUMN IF NOT EXISTS user_id text;

CREATE TABLE IF NOT EXISTS card_stats (
  card_id     text PRIMARY KEY,
  material_id text NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  srs         jsonb NOT NULL,
  known       boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS card_stats_material_idx ON card_stats(material_id);
CREATE INDEX IF NOT EXISTS card_stats_due_idx ON card_stats (((srs->>'due')::timestamptz));

-- ---- backfill legacy rows into materials --------------------------------

-- Quizzes -> materials (```quiz fence with a JSON payload).
INSERT INTO materials (id, workspace_id, workspace_name, kind, title, content, scope_chapters, scope_file_ids, privacy, color, created_at)
SELECT q.id, q.workspace_id, q.workspace_name, 'quiz', q.name,
  '# ' || q.name || E'\n\n' || '```quiz' || E'\n' ||
    jsonb_strip_nulls(jsonb_build_object('timeLimitMin', q.time_limit_min, 'questions', q.questions))::text
    || E'\n' || '```' || E'\n',
  q.chapters, '{}', q.privacy, 'green', q.created_at
FROM quizzes q
WHERE q.workspace_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Decks -> materials (```flashcards fence), one aggregated card list per deck.
INSERT INTO materials (id, workspace_id, workspace_name, kind, title, content, scope_chapters, scope_file_ids, privacy, color, created_at)
SELECT d.id, d.workspace_id, d.workspace_name, 'flashcards', d.name,
  '# ' || d.name || E'\n\n' || '```flashcards' || E'\n' ||
    jsonb_build_object('cards', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', c.id, 'front', c.front, 'back', c.back) ORDER BY c.id)
         FROM cards c WHERE c.deck_id = d.id),
      '[]'::jsonb))::text
    || E'\n' || '```' || E'\n',
  '{}', '{}', 'private', d.color, now()
FROM decks d
WHERE d.workspace_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM workspaces w WHERE w.id = d.workspace_id)
ON CONFLICT (id) DO NOTHING;

-- Cards -> card_stats (FSRS state), keyed by the original card id.
INSERT INTO card_stats (card_id, material_id, srs, known)
SELECT c.id, c.deck_id, c.srs, c.known
FROM cards c
WHERE EXISTS (SELECT 1 FROM materials m WHERE m.id = c.deck_id AND m.kind = 'flashcards')
ON CONFLICT (card_id) DO NOTHING;

-- Attempts predate the user_id column; recover ownership via the quiz material.
UPDATE attempts a SET user_id = w.user_id
FROM materials m JOIN workspaces w ON w.id = m.workspace_id
WHERE a.quiz_id = m.id AND a.user_id IS NULL;

-- ---- drop the legacy content tables -------------------------------------

DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS decks;
DROP TABLE IF EXISTS quizzes;
