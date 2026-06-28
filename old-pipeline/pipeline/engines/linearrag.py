"""LinearRAG: passages are the source of truth; concepts are only graph-hopping
anchors (no relation extraction).

Retrieval:
  1. Entity activation — concepts similar to the query, plus sentence-level
     semantic bridging (concepts of the query's nearest sentences).
  2. Personalized PageRank over the passage-concept bipartite graph, restarting
     on the activated concepts → passage importance.
  3. Blend with dense similarity and a light theme gate, then rank.

Preserves semantics (whole passages) while recovering cross-passage connectivity
via entity hopping — the paper's bipartite-PPR idea, with concept extraction and
theme gating from the design notes."""
from __future__ import annotations

from typing import Dict, List

from ..store.corpus import Corpus
from .ppr import personalized_pagerank

BRIDGE_WEIGHT = 0.5
DENSE_BLEND = 0.2
THEME_BOOST = 0.1


class LinearRagEngine:
    name = "linearrag"

    def retrieve(self, corpus: Corpus, embedder, workspace_id: str, query: str, k: int) -> List[Dict]:
        ws = workspace_id
        qvec = embedder.embed([query])[0]

        # 1. activation
        personalization: Dict[str, float] = {}
        activated_names = set()
        for cid, name, score in corpus.concept_search(ws, qvec, 12):
            if score > 0:
                personalization[cid] = personalization.get(cid, 0.0) + score
                activated_names.add(name)
        for cid, w in corpus.bridged_concepts(ws, qvec, 20):
            if w > 0:
                personalization[cid] = personalization.get(cid, 0.0) + BRIDGE_WEIGHT * w

        edges = corpus.passage_concept_edges(ws)
        if not edges or not personalization:
            return corpus.dense_search(ws, qvec, k)  # cold corpus → dense

        # 2. PPR
        ranks = personalized_pagerank(edges, personalization)
        passage_ids = {p for p, _, _ in edges}
        ranked = sorted(
            ((pid, sc) for pid, sc in ranks.items() if pid in passage_ids),
            key=lambda kv: -kv[1],
        )[: k * 2]
        ids = [pid for pid, _ in ranked]
        info = corpus.passages_info(ids)
        dense = {d["passageId"]: d["score"] for d in corpus.dense_search(ws, qvec, k * 3)}

        # 3. blend + theme gate
        out: List[Dict] = []
        for pid, sc in ranked:
            m = info.get(pid)
            if not m:
                continue
            score = sc + DENSE_BLEND * dense.get(pid, 0.0)
            if activated_names.intersection(m.get("themes") or []):
                score += THEME_BOOST
            out.append({"passageId": pid, "text": m["text"], "fileId": m["fileId"], "fileName": m["fileName"], "score": score})
        out.sort(key=lambda d: -d["score"])
        return out[:k]
