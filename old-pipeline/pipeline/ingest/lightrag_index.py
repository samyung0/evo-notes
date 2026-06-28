"""Build the LightRAG LLM knowledge graph for a document.

Runs AFTER the shared `indexer.index_document` has created the passages (which
LinearRAG/dense also use). This pass is additive and isolated: it only writes the
`lr_entities` / `lr_relations` / `lr_passage_entity` tables and never touches the
shared regex corpus, so LinearRAG is unaffected.

Per passage it asks the extraction LLM for entities, relations, and themes,
embeds them, and merges them into the workspace graph (entities deduped by
canonical name, relations and descriptions accumulated). Themes are stored as
'theme'-typed entities so the high-level signal lives in the same graph.
"""
from __future__ import annotations

import logging
from typing import Dict

from ..llm.client import LLMClient
from ..store.corpus import Corpus
from . import extract

log = logging.getLogger("evo.lightrag")


def _entity_text(name: str, description: str) -> str:
    return f"{name}: {description}" if description else name


def _relation_text(description: str, keywords) -> str:
    kw = " ".join(keywords)
    return f"{description} ({kw})" if kw else (description or "")


def build(corpus: Corpus, embedder, llm: LLMClient, ws: str, file_id: str, doc_id: str) -> int:
    """Extract and persist the LLM graph for one document. Returns the number of
    passages processed. Raises `extract.ExtractionUnavailable` when no extraction
    model is configured (the worker fails the job)."""
    corpus.reset_lightrag(ws, file_id)
    passages = corpus.document_passages(doc_id)

    n = 0
    for pid, text in passages:
        if not text or not text.strip():
            continue
        chunk = extract.extract_graph(llm, text)
        n += 1

        local_ids: Dict[str, str] = {}
        for ent in chunk.entities:
            emb = embedder.embed([_entity_text(ent.name, ent.description)])[0]
            eid = corpus.upsert_entity(ws, ent.name, ent.type, ent.description, emb)
            local_ids[ent.name] = eid
            corpus.link_passage_entity(pid, eid, 1.0)

        for theme in chunk.themes:
            if theme in local_ids:
                continue
            emb = embedder.embed([theme])[0]
            tid = corpus.upsert_entity(ws, theme, "theme", "", emb)
            local_ids[theme] = tid
            corpus.link_passage_entity(pid, tid, 0.5)

        for rel in chunk.relations:
            src = local_ids.get(rel.source)
            dst = local_ids.get(rel.target)
            if not src or not dst:
                continue
            desc = rel.description or f"{rel.source} — {rel.target}"
            remb = embedder.embed([_relation_text(desc, rel.keywords)])[0]
            corpus.add_lr_relation(ws, src, dst, desc, rel.keywords, rel.strength, remb)

    log.info("lightrag graph built for %s: %d passages", file_id, n)
    return n
