-- LightRAG (official) storage backends: Postgres + Apache AGE + pgvector.
--
-- The new RAG-Anything pipeline stores ALL of its state (KV cache, chunk
-- vectors, the knowledge graph, and doc-processing status) in LightRAG's own
-- `lightrag_*` tables and an AGE graph. LightRAG creates those itself on
-- `initialize_storages()`, so the Go migrator only needs to ensure the required
-- extensions exist.
--
-- Requirements:
--   * pgvector >= 0.7.0 (halfvec HNSW for 2560-dim embeddings) — provided by the
--     pgvector/pgvector:pg16 base of deploy/postgres/Dockerfile.
--   * Apache AGE preloaded: run Postgres with
--     `-c shared_preload_libraries=age` (set in deploy/docker-compose.yml).
--
-- Idempotent (IF NOT EXISTS) so the gateway can re-run it on every boot.
--
-- NOTE: the old custom-RAG migrations (0003_rag / 0004_rag_unique / 0005_lightrag,
-- which created passages/concepts/keywords/sentences/lr_entities/...) were removed
-- when the pipeline switched to RAG-Anything + official LightRAG. Those tables are
-- not recreated on fresh databases; any left over on an existing volume are unused
-- and harmless. This migration only ensures the extensions LightRAG needs.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS age;
