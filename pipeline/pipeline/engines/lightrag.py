"""LightRAG: dual-level retrieval over an entity graph.

  - Global / high-level: query -> high-level (theme) keyword vectors -> passages
    carrying those themes (broad recall).
  - Local / low-level: query -> nearest concepts, expanded one hop over the
    co-occurrence relation graph -> passages containing those concepts.
  - Both merged with dense similarity.

Runs on the same enriched corpus the worker builds (themes, high/low keywords,
relations), so it can be benchmarked head-to-head with LinearRAG on identical
inputs. Phase 4+ can swap co-occurrence relations for LLM-extracted ones."""
from __future__ import annotations

from typing import Dict, List

from ..store.corpus import Corpus

HIGH_WEIGHT = 0.15
LOW_WEIGHT = 0.10


class LightRagEngine:
    name = "lightrag"

    def retrieve(self, corpus: Corpus, embedder, workspace_id: str, query: str, k: int) -> List[Dict]:
        ws = workspace_id
        qvec = embedder.embed([query])[0]
        scores: Dict[str, float] = {}
        meta: Dict[str, Dict] = {}

        def merge(rows, key, weight):
            for r in rows:
                pid = r["passageId"]
                scores[pid] = scores.get(pid, 0.0) + weight * float(r.get(key, 1))
                meta.setdefault(pid, r)

        # global recall baseline
        for d in corpus.dense_search(ws, qvec, k * 2):
            scores[d["passageId"]] = scores.get(d["passageId"], 0.0) + d["score"]
            meta.setdefault(d["passageId"], d)

        # high-level: theme keywords -> passages
        hi_ids = [kid for kid, _, sc in corpus.keyword_search(ws, qvec, "high", 8) if sc > 0]
        merge(corpus.passages_for_keywords(ws, hi_ids, k * 2), "hits", HIGH_WEIGHT)

        # low-level: nearest concepts + one relation hop -> passages
        seeds = [cid for cid, _, sc in corpus.concept_search(ws, qvec, 10) if sc > 0]
        neighbours = [c for c, _ in corpus.relation_neighbors(ws, seeds)]
        concept_set = list({*seeds, *neighbours})
        merge(corpus.passages_for_concepts(ws, concept_set, k * 3), "w", LOW_WEIGHT)

        ranked = sorted(scores.items(), key=lambda kv: -kv[1])[:k]
        return [
            {"passageId": pid, "text": meta[pid]["text"], "fileId": meta[pid]["fileId"], "fileName": meta[pid]["fileName"], "score": sc}
            for pid, sc in ranked
        ]
