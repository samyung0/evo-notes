"""Engine interface + a dense baseline (cosine over passages).

Engines are corpus-agnostic: they receive a `Corpus` (Postgres or in-memory) and
a query, and return ranked passages. This is what lets the benchmark run every
engine over one fixed corpus, and the unit tests run them with no database.
"""
from __future__ import annotations

from typing import Dict, List, Protocol, runtime_checkable

from ..store.corpus import Corpus


@runtime_checkable
class RagEngine(Protocol):
    name: str

    def retrieve(self, corpus: Corpus, embedder, workspace_id: str, query: str, k: int) -> List[Dict]: ...


class DenseEngine:
    """Plain semantic search — the comparison baseline for both graph engines."""

    name = "dense"

    def retrieve(self, corpus: Corpus, embedder, workspace_id: str, query: str, k: int) -> List[Dict]:
        qvec = embedder.embed([query])[0]
        return corpus.dense_search(workspace_id, qvec, k)
