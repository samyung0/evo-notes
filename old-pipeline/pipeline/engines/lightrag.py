"""LightRAG: dual-level retrieval over an LLM-extracted entity/relation graph.

Mirrors HKUDS LightRAG (https://github.com/hkuds/lightrag):

  - The graph is built at ingest by an extraction LLM (see
    ``ingest.lightrag_index``): typed entities, typed relations with
    descriptions, and high-level themes — stored in the isolated ``lr_*`` tables.
  - At query time a keywords LLM splits the query into **low-level** keywords
    (specific entities) and **high-level** keywords (themes / relationships),
    the LightRAG analogue that replaces GraphRAG's community summaries.
  - **Local**: low-level keywords -> nearest entities -> one relation hop ->
    passages those entities appear in.
  - **Global**: high-level keywords -> nearest relations (by description) ->
    their endpoint entities -> passages.
  - Both are blended with a dense-similarity baseline and ranked.

When the keywords role is unavailable at query time, it degrades to using the
raw query vector for both levels so retrieval still works.
"""
from __future__ import annotations

import logging
from typing import Dict, List, Tuple

from ..llm.client import LLMClient
from ..store.corpus import Corpus

log = logging.getLogger("evo.lightrag")

LOCAL_WEIGHT = 0.5
GLOBAL_WEIGHT = 0.4

_KW_SYSTEM = "You extract search keywords from a question. Output ONLY valid JSON."
_KW_PROMPT = """Extract keywords from the query for a knowledge-graph search. Return a JSON object:
{{"high_level": [str], "low_level": [str]}}
- "low_level": specific entities, names, concrete terms in the query.
- "high_level": broad themes / topics / relationships the query is about.
QUERY: {query}
"""


class LightRagEngine:
    name = "lightrag"

    def __init__(self) -> None:
        self._llm = LLMClient()

    def retrieve(self, corpus: Corpus, embedder, workspace_id: str, query: str, k: int) -> List[Dict]:
        ws = workspace_id
        qvec = embedder.embed([query])[0]

        hi_kws, lo_kws = self._query_keywords(query)
        lo_vec = embedder.embed([" ".join(lo_kws)])[0] if lo_kws else qvec
        hi_vec = embedder.embed([" ".join(hi_kws)])[0] if hi_kws else qvec

        scores: Dict[str, float] = {}
        meta: Dict[str, Dict] = {}

        def merge(rows, weight):
            for r in rows:
                pid = r["passageId"]
                scores[pid] = scores.get(pid, 0.0) + weight * float(r.get("w", 1.0))
                meta.setdefault(pid, r)

        # dense baseline (always available, also the cold-corpus fallback)
        for d in corpus.dense_search(ws, qvec, k * 2):
            scores[d["passageId"]] = scores.get(d["passageId"], 0.0) + d["score"]
            meta.setdefault(d["passageId"], d)

        # local: low-level keywords -> entities -> one hop -> passages
        seeds = [eid for eid, _name, sc in corpus.entity_search(ws, lo_vec, 12) if sc > 0]
        neighbours = [e for e, _w in corpus.relation_neighbors_lr(ws, seeds)]
        entity_set = list({*seeds, *neighbours})
        merge(corpus.passages_for_entities(ws, entity_set, k * 3), LOCAL_WEIGHT)

        # global: high-level keywords -> relations -> endpoint entities -> passages
        rel_entities: set[str] = set()
        for _rid, src, dst, sc in corpus.relation_search(ws, hi_vec, 12):
            if sc > 0:
                rel_entities.add(src)
                rel_entities.add(dst)
        merge(corpus.passages_for_entities(ws, list(rel_entities), k * 3), GLOBAL_WEIGHT)

        ranked = sorted(scores.items(), key=lambda kv: -kv[1])[:k]
        return [
            {
                "passageId": pid,
                "text": meta[pid]["text"],
                "fileId": meta[pid]["fileId"],
                "fileName": meta[pid]["fileName"],
                "score": sc,
            }
            for pid, sc in ranked
        ]

    # ------------------------------------------------------------- helpers
    def _query_keywords(self, query: str) -> Tuple[List[str], List[str]]:
        """Split the query into (high_level, low_level) keyword lists via the
        keywords LLM; fall back to the raw query when the role is unavailable."""
        if not self._llm.available_role("keywords"):
            return [query], [query]
        data = self._llm.complete_json(_KW_PROMPT.format(query=query), system=_KW_SYSTEM, role="keywords")
        if not isinstance(data, dict):
            return [query], [query]
        hi = [str(x).strip() for x in (data.get("high_level") or []) if str(x).strip()]
        lo = [str(x).strip() for x in (data.get("low_level") or []) if str(x).strip()]
        return (hi or [query], lo or [query])
