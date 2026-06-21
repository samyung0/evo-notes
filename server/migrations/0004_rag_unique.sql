-- Uniqueness so the worker can upsert keywords/themes and accumulate
-- co-occurrence relation weights idempotently across re-ingests.
CREATE UNIQUE INDEX IF NOT EXISTS keywords_uniq ON keywords (workspace_id, term, level);
CREATE UNIQUE INDEX IF NOT EXISTS relations_uniq ON relations (workspace_id, src_concept_id, dst_concept_id);
