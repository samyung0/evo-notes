"""Embedding backends behind a tiny interface.

`hash` is a deterministic, dependency-free bag-of-words hashing embedder so the
whole pipeline runs offline for dev/CI. `st` swaps in sentence-transformers for
real semantic vectors (install the `embed` extra). Both emit EMBED_DIM vectors.
"""
from __future__ import annotations

import hashlib
import math
import re
from typing import List

from ..config import cfg, EMBED_DIM

_WORD = re.compile(r"[A-Za-z0-9]+")


def vec_literal(vec: List[float]) -> str:
    """pgvector text input: '[v1,v2,...]'. Cast ::vector on the SQL side."""
    return "[" + ",".join(f"{v:.6f}" for v in vec) + "]"


def _tokens(text: str) -> List[str]:
    return [t.lower() for t in _WORD.findall(text)]


class HashEmbedder:
    dim = EMBED_DIM

    def embed(self, texts: List[str]) -> List[List[float]]:
        return [self._one(t) for t in texts]

    def _one(self, text: str) -> List[float]:
        vec = [0.0] * self.dim
        toks = _tokens(text)
        for tok in toks:
            h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
            sign = 1.0 if (h & 1) else -1.0
            vec[h % self.dim] += sign
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]


class STEmbedder:
    def __init__(self) -> None:
        from sentence_transformers import SentenceTransformer  # type: ignore

        self.model = SentenceTransformer(cfg.st_model)
        self.dim = self.model.get_sentence_embedding_dimension()
        if self.dim != EMBED_DIM:
            raise RuntimeError(
                f"ST model dim {self.dim} != EMBED_DIM {EMBED_DIM}; update migration vector(N) and EMBED_DIM."
            )

    def embed(self, texts: List[str]) -> List[List[float]]:
        return [list(map(float, v)) for v in self.model.encode(texts, normalize_embeddings=True)]


def get_embedder():
    if cfg.embedder == "st":
        return STEmbedder()
    return HashEmbedder()
