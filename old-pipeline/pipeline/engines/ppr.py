"""Personalized PageRank over the passage-concept bipartite graph.

Pure-Python power iteration (no scipy dependency) — the graph is per-workspace
and sparse, so a dict-based random walk converges fast enough. Restart mass is
placed on the activated concept nodes (the personalization vector)."""
from __future__ import annotations

from collections import defaultdict
from typing import Dict, List, Tuple


def personalized_pagerank(
    edges: List[Tuple[str, str, float]],
    personalization: Dict[str, float],
    alpha: float = 0.85,
    iters: int = 30,
) -> Dict[str, float]:
    """edges: (passage_id, concept_id, weight) undirected bipartite links.
    Returns a score per node (passages and concepts)."""
    nbr: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
    deg: Dict[str, float] = defaultdict(float)
    for p, c, w in edges:
        nbr[p].append((c, w))
        nbr[c].append((p, w))
        deg[p] += w
        deg[c] += w

    nodes = list(deg.keys())
    if not nodes:
        return {}

    # Restart distribution e over concept nodes; uniform fallback if no activation.
    e = {n: 0.0 for n in nodes}
    total = sum(v for c, v in personalization.items() if c in e and v > 0)
    if total > 0:
        for c, wt in personalization.items():
            if c in e and wt > 0:
                e[c] += wt / total
    else:
        u = 1.0 / len(nodes)
        for n in nodes:
            e[n] = u

    r = dict(e)
    for _ in range(iters):
        nr = {n: (1.0 - alpha) * e[n] for n in nodes}
        for n in nodes:
            rn = r[n]
            if rn == 0.0 or deg[n] == 0.0:
                continue
            share = alpha * rn / deg[n]
            for m, w in nbr[n]:
                nr[m] += share * w
        r = nr
    return r
