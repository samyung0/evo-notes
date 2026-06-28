"""LLM entity / relation / theme extraction — the LightRAG knowledge-graph
builder.

This is the LLM-driven analogue of the regex `concepts.extract_concepts` used by
the shared corpus. It prompts the `extraction` role for typed entities, typed
relations (with a description that later powers global retrieval), and high-level
themes per passage, returning a normalized dict.

Unlike the shared corpus path there is NO heuristic fallback: lightrag requires a
configured extraction model, so `extract_graph` raises when the role is
unavailable. The ingest worker turns that into a failed job.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List

from ..llm.client import LLMClient

_SYSTEM = (
    "You are an information-extraction engine that builds a knowledge graph from "
    "study material. You output ONLY valid JSON, no prose, no markdown fences."
)

_PROMPT = """From the passage below, extract a knowledge graph as a single JSON object with keys:
- "entities": array of {{"name": str, "type": str, "description": str}} — salient
  named concepts, people, methods, systems, terms. "type" is a short lowercase
  category (e.g. concept, method, person, organization, system, metric). "name"
  must be concise and canonical (no articles).
- "relations": array of {{"source": str, "target": str, "description": str,
  "keywords": [str], "strength": number 1-10}} — directed/undirected links between
  two extracted entity names. "description" states how they relate. "keywords"
  are 1-4 words capturing the relationship.
- "themes": array of str — 1-5 high-level topics/themes the passage is about
  (broader than individual entities).

Use only information present in the passage. Every relation's source and target
MUST be names that also appear in "entities". Return ONLY the JSON object.

PASSAGE:
{text}
"""


class ExtractionUnavailable(RuntimeError):
    """Raised when the extraction role has no configured provider."""


@dataclass
class Entity:
    name: str
    type: str
    description: str


@dataclass
class Relation:
    source: str
    target: str
    description: str
    keywords: List[str]
    strength: float


@dataclass
class GraphChunk:
    entities: List[Entity] = field(default_factory=list)
    relations: List[Relation] = field(default_factory=list)
    themes: List[str] = field(default_factory=list)


def _clean(s: Any) -> str:
    return str(s or "").strip()


def _name(s: Any) -> str:
    return _clean(s).lower()


def extract_graph(llm: LLMClient, text: str, max_tokens: int = 4096) -> GraphChunk:
    """Extract a `GraphChunk` from one passage via the extraction-role LLM.

    Raises `ExtractionUnavailable` if no extraction provider is configured."""
    if not llm.available_role("extraction"):
        raise ExtractionUnavailable(
            "lightrag requires an extraction LLM, but the 'extraction' role has no "
            "configured provider/key. Set the provider key or pin a different engine."
        )
    data = llm.complete_json(_PROMPT.format(text=text), system=_SYSTEM, role="extraction", max_tokens=max_tokens)
    return _normalize(data)


def _normalize(data: Any) -> GraphChunk:
    chunk = GraphChunk()
    if not isinstance(data, dict):
        return chunk

    seen_entities: set[str] = set()
    for raw in data.get("entities") or []:
        if not isinstance(raw, dict):
            continue
        name = _name(raw.get("name"))
        if not name or name in seen_entities:
            continue
        seen_entities.add(name)
        chunk.entities.append(Entity(
            name=name,
            type=_clean(raw.get("type")) or "concept",
            description=_clean(raw.get("description")),
        ))

    for raw in data.get("relations") or []:
        if not isinstance(raw, dict):
            continue
        src = _name(raw.get("source") or raw.get("src"))
        dst = _name(raw.get("target") or raw.get("dst"))
        # Only keep relations between entities we actually extracted.
        if not src or not dst or src == dst or src not in seen_entities or dst not in seen_entities:
            continue
        kws = raw.get("keywords") or []
        keywords = [_clean(k) for k in kws if _clean(k)] if isinstance(kws, list) else []
        try:
            strength = float(raw.get("strength", 1) or 1)
        except (TypeError, ValueError):
            strength = 1.0
        chunk.relations.append(Relation(
            source=src,
            target=dst,
            description=_clean(raw.get("description")),
            keywords=keywords,
            strength=max(1.0, min(strength, 10.0)),
        ))

    themes = data.get("themes") or []
    if isinstance(themes, list):
        chunk.themes = [_name(t) for t in themes if _name(t)]

    return chunk
