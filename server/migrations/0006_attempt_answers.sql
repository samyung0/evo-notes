-- Persist per-question data on attempts so a past attempt can render a full
-- result breakdown: `answers` is a map keyed by question id (shape mirrors the
-- frontend Answer union), `questions` is the question snapshot taken at submit
-- time (so later quiz edits don't distort historical results). Idempotent.

ALTER TABLE attempts ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}';
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS questions jsonb NOT NULL DEFAULT '[]';
