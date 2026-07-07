-- Study-tools upgrade: FSRS scheduling state on cards, a per-user mistakes pool
-- for the "Review mistakes" quiz, and migration of legacy question "difficulty"
-- onto the new cognitive "level" labels. Idempotent so the startup runner can
-- re-apply it safely.

/* ---- cards.srs: FSRS state (shape mirrors SrsState in src/api/types.ts) ---- */

ALTER TABLE cards ADD COLUMN IF NOT EXISTS srs jsonb NOT NULL DEFAULT jsonb_build_object(
  'due', to_jsonb(now()),
  'stability', 0, 'difficulty', 0, 'elapsed_days', 0, 'scheduled_days', 0,
  'reps', 0, 'lapses', 0, 'state', 0, 'learning_steps', 0
);

-- Give already-known seed cards a plausible "review" state that isn't due yet,
-- so knownPct / dueCount look realistic. Runs once: after it sets state=2 the
-- guard (state=0) prevents clobbering real review progress on restart.
UPDATE cards SET srs = jsonb_build_object(
  'due', to_jsonb(now() + interval '3 days'),
  'stability', 12, 'difficulty', 5, 'elapsed_days', 0, 'scheduled_days', 3,
  'reps', 2, 'lapses', 0, 'state', 2, 'learning_steps', 0
) WHERE known = true AND COALESCE(srs->>'state', '0') = '0';

-- NOTE: (srs->>'due')::timestamptz cannot be indexed — the text->timestamptz
-- cast is only STABLE (timezone-dependent), and Postgres requires IMMUTABLE
-- expressions in indexes. Index the raw text instead: the stored values are
-- uniform ISO-8601 UTC strings, which sort chronologically.
CREATE INDEX IF NOT EXISTS cards_due_idx ON cards ((srs->>'due'));

/* ---- per-user mistakes pool ------------------------------------------------ */

CREATE TABLE IF NOT EXISTS mistakes (
  user_id     text NOT NULL,
  question_id text NOT NULL,
  question    jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX IF NOT EXISTS mistakes_user_idx ON mistakes(user_id, updated_at DESC);

/* ---- legacy difficulty -> cognitive level --------------------------------- */
-- Rewrite each question object, renaming "difficulty" to "level" and mapping
-- easy->recall, medium->application, hard->analysis. Guarded by EXISTS so it
-- only touches rows that still carry the old key (and never nulls an [] array).

UPDATE quizzes q SET questions = (
  SELECT jsonb_agg(
    CASE WHEN elem ? 'difficulty'
      THEN (elem - 'difficulty') || jsonb_build_object('level',
        CASE elem->>'difficulty'
          WHEN 'easy' THEN 'recall'
          WHEN 'hard' THEN 'analysis'
          ELSE 'application'
        END)
      ELSE elem END
  )
  FROM jsonb_array_elements(q.questions) elem
)
WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(q.questions) e WHERE e ? 'difficulty');

UPDATE public_quizzes q SET questions = (
  SELECT jsonb_agg(
    CASE WHEN elem ? 'difficulty'
      THEN (elem - 'difficulty') || jsonb_build_object('level',
        CASE elem->>'difficulty'
          WHEN 'easy' THEN 'recall'
          WHEN 'hard' THEN 'analysis'
          ELSE 'application'
        END)
      ELSE elem END
  )
  FROM jsonb_array_elements(q.questions) elem
)
WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(q.questions) e WHERE e ? 'difficulty');
