"""Concept extraction — the graph-hopping anchors for both engines.

Dev default is a dependency-free heuristic (capitalized phrases + frequent
content words). Install the `nlp` extra to swap in spaCy noun-chunks / KeyBERT
for stronger concept mining on technical corpora (the cross-domain recall point
from the design notes)."""
from __future__ import annotations

import re
from typing import List

_CAP = re.compile(r"\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\b")
_WORD = re.compile(r"[A-Za-z][A-Za-z\-]{3,}")

_STOP = {
    "the", "and", "for", "are", "but", "not", "you", "your", "with", "this", "that",
    "from", "they", "have", "has", "was", "were", "will", "would", "could", "should",
    "their", "there", "which", "when", "what", "into", "than", "then", "them", "these",
    "those", "such", "also", "about", "between", "across", "using", "used", "use",
}


def extract_concepts(text: str, max_n: int = 8) -> List[str]:
    scores: dict[str, float] = {}
    for m in _CAP.finditer(text):
        name = m.group(1).strip().lower()
        if name not in _STOP:
            scores[name] = scores.get(name, 0.0) + 2.0
    for w in _WORD.findall(text):
        wl = w.lower()
        if wl in _STOP:
            continue
        scores[wl] = scores.get(wl, 0.0) + 1.0
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    return [name for name, _ in ranked[:max_n]]
