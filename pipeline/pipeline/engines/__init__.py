"""RAG engine registry. Both engines read the same Postgres corpus; the engine
is pinned at deploy via EVO_ENGINE but swappable for benchmarking."""
from __future__ import annotations

from .base import DenseEngine, RagEngine

__all__ = ["RagEngine", "DenseEngine", "get_engine"]


def get_engine(name: str) -> RagEngine:
    name = (name or "dense").lower()
    if name == "linearrag":
        from .linearrag import LinearRagEngine

        return LinearRagEngine()
    if name == "lightrag":
        from .lightrag import LightRagEngine

        return LightRagEngine()
    return DenseEngine()
