"""Evo Notes RAG pipeline (official LightRAG, post RAG-Anything merge).

Two runtime roles share this package (compose picks the command):
- ``pipeline.ingest.worker``   — claims ingest jobs, parses on Modal, builds the
  LightRAG knowledge graph, publishes progress to Redis.
- ``pipeline.retrieve.service`` — FastAPI chat/generate over the per-workspace
  LightRAG instances.
"""
