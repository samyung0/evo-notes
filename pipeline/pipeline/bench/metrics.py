"""Ranking metrics for the retrieval benchmark (binary relevance at the
document level)."""
from __future__ import annotations

import math
from typing import Sequence, Set


def reciprocal_rank(ranked: Sequence[str], relevant: Set[str]) -> float:
    for i, d in enumerate(ranked):
        if d in relevant:
            return 1.0 / (i + 1)
    return 0.0


def recall_at_k(ranked: Sequence[str], relevant: Set[str], k: int) -> float:
    if not relevant:
        return 0.0
    return len(set(ranked[:k]) & relevant) / len(relevant)


def ndcg_at_k(ranked: Sequence[str], relevant: Set[str], k: int) -> float:
    dcg = sum(1.0 / math.log2(i + 2) for i, d in enumerate(ranked[:k]) if d in relevant)
    ideal = sum(1.0 / math.log2(i + 2) for i in range(min(len(relevant), k)))
    return dcg / ideal if ideal > 0 else 0.0


def mean(xs: Sequence[float]) -> float:
    return sum(xs) / len(xs) if xs else 0.0
