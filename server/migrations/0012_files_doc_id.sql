-- Evo Notes — record the LightRAG document id backing each ingested file.
--
-- The pipeline moved from RAG-Anything's `insert_content_list(doc_id=fileId)`
-- to LightRAG v1.5's native ingestion pipeline, which derives its own
-- deterministic doc ids (md5 of the canonical basename). The Python worker
-- writes the resulting doc id here after ingest and reads it back to resolve
-- basename collisions / job retries; it also gives us the file -> document
-- mapping needed for future doc deletion or scoped-retrieval support.

ALTER TABLE files ADD COLUMN IF NOT EXISTS doc_id text;
