-- Evo Notes — unify all generated study artifacts into Plate `materials`.
--
-- Quizzes and flashcards used to live in their own relational tables. They now
-- become Plate documents in `materials`, with a typed custom element.
-- Per-user scheduling and
-- scoring state moves to `card_stats` (FSRS) and `attempts.user_id`; the mistakes
-- pool is unchanged.
--
-- The legacy tables are recreated + reseeded by 0001/0002 on every boot, so this
-- migration backfills them into `materials` (idempotent via ON CONFLICT) and then
-- drops them, leaving `materials` as the single runtime source of truth.

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
-- Raw-text index: the timestamptz cast is not IMMUTABLE (see 0005).
CREATE INDEX IF NOT EXISTS card_stats_due_idx ON card_stats ((srs->>'due'));

-- ---- backfill legacy rows into materials --------------------------------

-- Quizzes -> materials (typed quiz element).
INSERT INTO materials (id, workspace_id, workspace_name, kind, title, content, scope_chapters, scope_file_ids, privacy, color, created_at)
SELECT q.id, q.workspace_id, q.workspace_name, 'quiz', q.name,
  jsonb_build_object(
    'schemaVersion', 1,
    'value', jsonb_build_array(
      jsonb_build_object('type','h1','children',jsonb_build_array(jsonb_build_object('text',q.name))),
      jsonb_strip_nulls(jsonb_build_object(
        'type','quiz',
        'id',q.id || ':quiz',
        'timeLimitMin',q.time_limit_min,
        'children',COALESCE((
          SELECT jsonb_agg(
            jsonb_strip_nulls(jsonb_build_object(
              'type','quiz_question',
              'id',question.value->>'id',
              'questionType',question.value->>'type',
              'level',question.value->>'level',
              'correctOptionIds',CASE question.value->>'type'
                WHEN 'mcq' THEN (
                  SELECT jsonb_agg(
                    to_jsonb((question.value->>'id') || ':option:' ||
                      (((correct.value #>> '{}')::int + 1)::text))
                    ORDER BY correct.ordinality
                  )
                  FROM jsonb_array_elements(question.value->'correct')
                    WITH ORDINALITY AS correct(value, ordinality)
                )
                WHEN 'multi' THEN (
                  SELECT jsonb_agg(
                    to_jsonb((question.value->>'id') || ':option:' ||
                      (((correct.value #>> '{}')::int + 1)::text))
                    ORDER BY correct.ordinality
                  )
                  FROM jsonb_array_elements(question.value->'correct')
                    WITH ORDINALITY AS correct(value, ordinality)
                )
                WHEN 'boolean' THEN jsonb_build_array(
                  (question.value->>'id') || ':option:' ||
                  CASE WHEN (question.value->>'correct')::boolean THEN '1' ELSE '2' END
                )
                ELSE NULL
              END,
              'correctBoolean',CASE WHEN question.value->>'type'='boolean'
                THEN (question.value->>'correct')::boolean ELSE NULL END,
              'acceptedAnswers',CASE WHEN question.value->>'type' IN ('fill','short')
                THEN COALESCE((
                  SELECT jsonb_agg(to_jsonb(answer.value->>'value') ORDER BY answer.ordinality)
                  FROM jsonb_array_elements(question.value->'accepted')
                    WITH ORDINALITY AS answer(value, ordinality)
                ), '[]'::jsonb)
                ELSE NULL END,
              'pairs',CASE WHEN question.value->>'type'='matching'
                THEN COALESCE(question.value->'pairs','[]'::jsonb) ELSE NULL END,
              'children',
                jsonb_build_array(jsonb_build_object(
                  'type','quiz_prompt',
                  'children',jsonb_build_array(jsonb_build_object(
                    'text',COALESCE(question.value->>'prompt','')
                  ))
                ))
                ||
                CASE question.value->>'type'
                  WHEN 'mcq' THEN COALESCE((
                    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                      'type','quiz_option',
                      'id',(question.value->>'id') || ':option:' || option.ordinality,
                      'explanation',option.value->>'explanation',
                      'children',jsonb_build_array(jsonb_build_object(
                        'text',COALESCE(option.value->>'value','')
                      ))
                    )) ORDER BY option.ordinality)
                    FROM jsonb_array_elements(question.value->'options')
                      WITH ORDINALITY AS option(value, ordinality)
                  ), '[]'::jsonb)
                  WHEN 'multi' THEN COALESCE((
                    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                      'type','quiz_option',
                      'id',(question.value->>'id') || ':option:' || option.ordinality,
                      'explanation',option.value->>'explanation',
                      'children',jsonb_build_array(jsonb_build_object(
                        'text',COALESCE(option.value->>'value','')
                      ))
                    )) ORDER BY option.ordinality)
                    FROM jsonb_array_elements(question.value->'options')
                      WITH ORDINALITY AS option(value, ordinality)
                  ), '[]'::jsonb)
                  WHEN 'boolean' THEN jsonb_build_array(
                    jsonb_build_object(
                      'type','quiz_option',
                      'id',(question.value->>'id') || ':option:1',
                      'children',jsonb_build_array(jsonb_build_object('text','True'))
                    ),
                    jsonb_build_object(
                      'type','quiz_option',
                      'id',(question.value->>'id') || ':option:2',
                      'children',jsonb_build_array(jsonb_build_object('text','False'))
                    )
                  )
                  WHEN 'fill' THEN COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                      'type','quiz_option',
                      'id',(question.value->>'id') || ':option:' || answer.ordinality,
                      'role','accepted-answer',
                      'children',jsonb_build_array(jsonb_build_object(
                        'text',COALESCE(answer.value->>'value','')
                      ))
                    ) ORDER BY answer.ordinality)
                    FROM jsonb_array_elements(question.value->'accepted')
                      WITH ORDINALITY AS answer(value, ordinality)
                  ), '[]'::jsonb)
                  WHEN 'short' THEN COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                      'type','quiz_option',
                      'id',(question.value->>'id') || ':option:' || answer.ordinality,
                      'role','accepted-answer',
                      'children',jsonb_build_array(jsonb_build_object(
                        'text',COALESCE(answer.value->>'value','')
                      ))
                    ) ORDER BY answer.ordinality)
                    FROM jsonb_array_elements(question.value->'accepted')
                      WITH ORDINALITY AS answer(value, ordinality)
                  ), '[]'::jsonb)
                  WHEN 'matching' THEN COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                      'type','quiz_option',
                      'id',(question.value->>'id') || ':option:' || pair.ordinality,
                      'role','matching-pair',
                      'children',jsonb_build_array(jsonb_build_object(
                        'text',COALESCE(pair.value->>'left','') || ' → ' ||
                          COALESCE(pair.value->>'right','')
                      ))
                    ) ORDER BY pair.ordinality)
                    FROM jsonb_array_elements(question.value->'pairs')
                      WITH ORDINALITY AS pair(value, ordinality)
                  ), '[]'::jsonb)
                  WHEN 'ordering' THEN COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                      'type','quiz_option',
                      'id',(question.value->>'id') || ':option:' || item.ordinality,
                      'role','ordering-item',
                      'children',jsonb_build_array(jsonb_build_object(
                        'text',COALESCE(item.value->>'value','')
                      ))
                    ) ORDER BY item.ordinality)
                    FROM jsonb_array_elements(question.value->'items')
                      WITH ORDINALITY AS item(value, ordinality)
                  ), '[]'::jsonb)
                  ELSE '[]'::jsonb
                END
                ||
                CASE WHEN COALESCE(question.value->>'explanation','') <> ''
                  THEN jsonb_build_array(jsonb_build_object(
                    'type','quiz_explanation',
                    'children',jsonb_build_array(jsonb_build_object(
                      'text',question.value->>'explanation'
                    ))
                  ))
                  ELSE '[]'::jsonb
                END
            ))
            ORDER BY question.ordinality
          )
          FROM jsonb_array_elements(q.questions)
            WITH ORDINALITY AS question(value, ordinality)
        ), '[]'::jsonb)
      ))
    )
  ),
  q.chapters, '{}', q.privacy, 'green', q.created_at
FROM quizzes q
WHERE q.workspace_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Decks -> materials (typed flashcards element), one aggregated card list per deck.
INSERT INTO materials (id, workspace_id, workspace_name, kind, title, content, scope_chapters, scope_file_ids, privacy, color, created_at)
SELECT d.id, d.workspace_id, d.workspace_name, 'flashcards', d.name,
  jsonb_build_object(
    'schemaVersion', 1,
    'value', jsonb_build_array(
      jsonb_build_object('type','h1','children',jsonb_build_array(jsonb_build_object('text',d.name))),
      jsonb_build_object(
        'type','flashcards',
        'id',d.id || ':flashcards',
        'children',COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'type','flashcard',
            'id',c.id,
            'children',jsonb_build_array(
              jsonb_build_object(
                'type','flashcard_front',
                'children',jsonb_build_array(jsonb_build_object('text',c.front))
              ),
              jsonb_build_object(
                'type','flashcard_back',
                'children',jsonb_build_array(jsonb_build_object('text',c.back))
              )
            )
          ) ORDER BY c.id)
             FROM cards c WHERE c.deck_id = d.id),
          jsonb_build_array(jsonb_build_object(
            'type','flashcard',
            'id',d.id || ':card:1',
            'children',jsonb_build_array(
              jsonb_build_object(
                'type','flashcard_front',
                'children',jsonb_build_array(jsonb_build_object('text',''))
              ),
              jsonb_build_object(
                'type','flashcard_back',
                'children',jsonb_build_array(jsonb_build_object('text',''))
              )
            )
          )))
      )
    )
  ),
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

-- Empty legacy decks receive the canonical blank card created above. Seed a
-- fresh FSRS row for every authored card not already copied from `cards`.
INSERT INTO card_stats (card_id, material_id, srs, known)
SELECT card.value->>'id', m.id,
  jsonb_build_object(
    'due', to_jsonb(now()),
    'stability', 0, 'difficulty', 0, 'elapsed_days', 0, 'scheduled_days', 0,
    'reps', 0, 'lapses', 0, 'state', 0, 'learning_steps', 0
  ),
  false
FROM materials m
CROSS JOIN LATERAL jsonb_array_elements(m.content->'value') AS block(value)
CROSS JOIN LATERAL jsonb_array_elements(block.value->'children') AS card(value)
WHERE m.kind='flashcards'
  AND block.value->>'type'='flashcards'
  AND card.value->>'type'='flashcard'
ON CONFLICT (card_id) DO NOTHING;

-- Attempts predate the user_id column; recover ownership via the quiz material.
UPDATE attempts a SET user_id = w.user_id
FROM materials m JOIN workspaces w ON w.id = m.workspace_id
WHERE a.quiz_id = m.id AND a.user_id IS NULL;

-- ---- drop the legacy content tables -------------------------------------

DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS decks;
DROP TABLE IF EXISTS quizzes;
