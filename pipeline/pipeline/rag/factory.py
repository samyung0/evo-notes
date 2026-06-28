"""Build a per-workspace ``RAGAnything`` over the shared Postgres + AGE +
pgvector backends.

Each call creates a ``LightRAG(workspace=workspaceId, ...)`` so the four PG
storages (KV / vector / graph / doc-status) are isolated per tenant: the PG
storages add a ``workspace`` column, and ``PGGraphStorage`` derives a
per-workspace AGE graph name from it automatically.

The worker and retrieval service build different *kinds* of instance (ingest
uses the fixed flash model; query uses the pro/flash dispatcher), but both share
the SAME embedding function/dimension — that is mandatory because they read and
write the same vector store.
"""
from __future__ import annotations

import logging
from typing import Callable

from lightrag import LightRAG
from raganything import RAGAnything, RAGAnythingConfig

from ..config import cfg
from .models import make_embedding_func, make_llm_func, make_query_llm_func, make_vision_func

log = logging.getLogger("evo.rag.factory")

# Embedding func/dim must be identical across every instance in the process.
_embedding_func = make_embedding_func()


def _rag_config() -> RAGAnythingConfig:
    return RAGAnythingConfig(
        working_dir=cfg.working_dir,
        parser="mineru",
        parse_method=cfg.parse_method,
        enable_image_processing=True,
        enable_table_processing=True,
        enable_equation_processing=True,
    )


async def _build(workspace: str, llm_func: Callable, *, enable_llm_cache: bool) -> RAGAnything:
    vision_func = make_vision_func(text_fallback=llm_func)

    lightrag = LightRAG(
        working_dir=cfg.working_dir,
        workspace=workspace,
        llm_model_func=llm_func,
        embedding_func=_embedding_func,
        kv_storage="PGKVStorage",
        vector_storage="PGVectorStorage",
        graph_storage="PGGraphStorage",
        doc_status_storage="PGDocStatusStorage",
        enable_llm_cache=enable_llm_cache,
    )

    rag = RAGAnything(
        lightrag=lightrag,
        llm_model_func=llm_func,
        vision_model_func=vision_func,
        embedding_func=_embedding_func,
        config=_rag_config(),
    )
    # Parsing runs on Modal, not in this container, so there is no local MineRU to
    # verify — skip RAGAnything's parser-installation gate.
    rag._parser_installation_checked = True

    result = await rag._ensure_lightrag_initialized()
    if not result or not result.get("success"):
        raise RuntimeError(
            f"LightRAG init failed for workspace {workspace}: {(result or {}).get('error')}"
        )
    log.info("built RAGAnything for workspace=%s (llm_cache=%s)", workspace, enable_llm_cache)
    return rag


async def build_ingest_rag(workspace: str) -> RAGAnything:
    """Ingest-side instance: fixed cheap extraction model, LLM cache on."""
    return await _build(workspace, make_llm_func(cfg.ingest_model), enable_llm_cache=True)


async def build_query_rag(workspace: str) -> RAGAnything:
    """Query-side instance: model chosen per request (pro default / flash alt).

    LLM cache is disabled so a flash-vs-pro switch can't serve a cached answer
    produced by the other model.
    """
    return await _build(workspace, make_query_llm_func(), enable_llm_cache=False)
