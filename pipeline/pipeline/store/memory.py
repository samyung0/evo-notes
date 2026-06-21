"""In-process corpus — a dependency-free `Corpus` for benchmarking and tests.

Mirrors the semantics of the Postgres/pgvector queries in `store.db` (cosine
similarity = ``1 - cosine_distance``, the same group-by/order-by shaping) but
keeps everything in plain Python dicts/lists. No psycopg, no numpy, so the real
engine algorithms can be exercised offline and deterministically.

It is intentionally O(n) per query: benchmark corpora are small and the point is
algorithmic fidelity, not scale.
"""
from __future__ import annotations

import itertools
import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Sequence, Tuple


def cosine(a: Sequence[float], b: Sequence[float]) -> float:
    """Cosine similarity; matches pgvector's ``1 - (a <=> b)``."""
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b):
        dot += x * y
        na += x * x
        nb += y * y
    denom = math.sqrt(na) * math.sqrt(nb)
    return dot / denom if denom else 0.0


@dataclass
class _Passage:
    id: str
    document_id: str
    ws: str
    ord: int
    text: str
    themes: List[str]
    emb: List[float]


@dataclass
class _Sentence:
    id: str
    passage_id: str
    ws: str
    ord: int
    text: str
    emb: List[float]


@dataclass
class _Concept:
    id: str
    ws: str
    name: str
    emb: List[float]


@dataclass
class _Keyword:
    id: str
    ws: str
    term: str
    level: str
    emb: List[float]


@dataclass
class MemoryCorpus:
    """A single in-memory RAG corpus implementing the `Corpus` protocol."""

    passages: Dict[str, _Passage] = field(default_factory=dict)
    sentences: Dict[str, _Sentence] = field(default_factory=dict)
    concepts: Dict[str, _Concept] = field(default_factory=dict)
    keywords: Dict[str, _Keyword] = field(default_factory=dict)
    # document_id -> file_id ; file_id -> name
    doc_file: Dict[str, str] = field(default_factory=dict)
    file_name: Dict[str, str] = field(default_factory=dict)
    # (workspace, canonical_name) -> concept_id ; (workspace, term, level) -> keyword_id
    _concept_by_name: Dict[Tuple[str, str], str] = field(default_factory=dict)
    _keyword_by_term: Dict[Tuple[str, str, str], str] = field(default_factory=dict)
    passage_concept: List[Tuple[str, str, float]] = field(default_factory=list)
    sentence_concept: List[Tuple[str, str, float]] = field(default_factory=list)
    passage_keyword: List[Tuple[str, str]] = field(default_factory=list)
    relations: Dict[Tuple[str, str, str], float] = field(default_factory=dict)
    _seq: itertools.count = field(default_factory=lambda: itertools.count(1))

    # ------------------------------------------------------------------ ids
    def _uid(self, prefix: str) -> str:
        return f"{prefix}_{next(self._seq):06d}"

    def add_file(self, file_id: str, name: str) -> None:
        """Register a file's display name (the gateway/`files` row equivalent)."""
        self.file_name[file_id] = name

    def _file(self, document_id: str) -> Tuple[str, str]:
        fid = self.doc_file.get(document_id, document_id)
        return fid, self.file_name.get(fid, fid)

    # ----------------------------------------------------------- reads
    def dense_search(self, ws: str, qvec: Sequence[float], k: int) -> List[Dict[str, Any]]:
        scored = [
            (cosine(qvec, p.emb), p)
            for p in self.passages.values()
            if p.ws == ws and p.emb
        ]
        scored.sort(key=lambda t: -t[0])
        out: List[Dict[str, Any]] = []
        for score, p in scored[:k]:
            fid, fname = self._file(p.document_id)
            out.append({"passageId": p.id, "text": p.text, "fileId": fid, "fileName": fname, "score": float(score)})
        return out

    def concept_search(self, ws: str, qvec: Sequence[float], k: int) -> List[Tuple[str, str, float]]:
        scored = [
            (cosine(qvec, c.emb), c)
            for c in self.concepts.values()
            if c.ws == ws and c.emb
        ]
        scored.sort(key=lambda t: -t[0])
        return [(c.id, c.name, float(s)) for s, c in scored[:k]]

    def bridged_concepts(self, ws: str, qvec: Sequence[float], k: int) -> List[Tuple[str, float]]:
        scored = [
            (cosine(qvec, s.emb), s)
            for s in self.sentences.values()
            if s.ws == ws and s.emb
        ]
        scored.sort(key=lambda t: -t[0])
        top = scored[:k]
        sims = {s.id: sim for sim, s in top}
        agg: Dict[str, float] = {}
        for sid, cid, w in self.sentence_concept:
            if sid in sims:
                agg[cid] = agg.get(cid, 0.0) + sims[sid] * w
        return [(cid, float(w)) for cid, w in agg.items()]

    def passage_concept_edges(self, ws: str) -> List[Tuple[str, str, float]]:
        return [
            (pid, cid, float(w))
            for pid, cid, w in self.passage_concept
            if pid in self.passages and self.passages[pid].ws == ws
        ]

    def passages_info(self, ids: Sequence[str]) -> Dict[str, Dict[str, Any]]:
        out: Dict[str, Dict[str, Any]] = {}
        for pid in ids:
            p = self.passages.get(pid)
            if not p:
                continue
            fid, fname = self._file(p.document_id)
            out[pid] = {"passageId": pid, "text": p.text, "fileId": fid, "fileName": fname, "themes": list(p.themes)}
        return out

    def keyword_search(self, ws: str, qvec: Sequence[float], level: str, k: int) -> List[Tuple[str, str, float]]:
        scored = [
            (cosine(qvec, kw.emb), kw)
            for kw in self.keywords.values()
            if kw.ws == ws and kw.level == level and kw.emb
        ]
        scored.sort(key=lambda t: -t[0])
        return [(kw.id, kw.term, float(s)) for s, kw in scored[:k]]

    def passages_for_keywords(self, ws: str, keyword_ids: Sequence[str], limit: int) -> List[Dict[str, Any]]:
        if not keyword_ids:
            return []
        wanted = set(keyword_ids)
        hits: Dict[str, int] = {}
        for pid, kid in self.passage_keyword:
            if kid in wanted and pid in self.passages and self.passages[pid].ws == ws:
                hits[pid] = hits.get(pid, 0) + 1
        ranked = sorted(hits.items(), key=lambda kv: -kv[1])[:limit]
        out: List[Dict[str, Any]] = []
        for pid, n in ranked:
            p = self.passages[pid]
            fid, fname = self._file(p.document_id)
            out.append({"passageId": pid, "text": p.text, "fileId": fid, "fileName": fname, "hits": int(n)})
        return out

    def relation_neighbors(self, ws: str, concept_ids: Sequence[str]) -> List[Tuple[str, float]]:
        if not concept_ids:
            return []
        seeds = set(concept_ids)
        out: List[Tuple[str, float]] = []
        for (rws, a, b), w in self.relations.items():
            if rws != ws:
                continue
            if a in seeds:
                out.append((b, float(w)))
            elif b in seeds:
                out.append((a, float(w)))
        return out

    def passages_for_concepts(self, ws: str, concept_ids: Sequence[str], limit: int) -> List[Dict[str, Any]]:
        if not concept_ids:
            return []
        wanted = set(concept_ids)
        agg: Dict[str, float] = {}
        for pid, cid, w in self.passage_concept:
            if cid in wanted and pid in self.passages and self.passages[pid].ws == ws:
                agg[pid] = agg.get(pid, 0.0) + w
        ranked = sorted(agg.items(), key=lambda kv: -kv[1])[:limit]
        out: List[Dict[str, Any]] = []
        for pid, w in ranked:
            p = self.passages[pid]
            fid, fname = self._file(p.document_id)
            out.append({"passageId": pid, "text": p.text, "fileId": fid, "fileName": fname, "w": float(w)})
        return out

    # ----------------------------------------------------------- writes
    def reset_document(self, file_id: str) -> None:
        doc_ids = {d for d, f in self.doc_file.items() if f == file_id}
        if not doc_ids:
            return
        pids = {pid for pid, p in self.passages.items() if p.document_id in doc_ids}
        sids = {sid for sid, s in self.sentences.items() if s.passage_id in pids}
        self.passages = {k: v for k, v in self.passages.items() if k not in pids}
        self.sentences = {k: v for k, v in self.sentences.items() if k not in sids}
        self.passage_concept = [e for e in self.passage_concept if e[0] not in pids]
        self.sentence_concept = [e for e in self.sentence_concept if e[0] not in sids]
        self.passage_keyword = [e for e in self.passage_keyword if e[0] not in pids]
        for d in doc_ids:
            self.doc_file.pop(d, None)

    def insert_document(self, file_id: str, ws: str, parser: str, pages: int) -> str:
        doc_id = self._uid("doc")
        self.doc_file[doc_id] = file_id
        self.file_name.setdefault(file_id, file_id)
        return doc_id

    def insert_passage(self, doc_id: str, ws: str, ordn: int, text: str, themes: List[str], emb: Sequence[float]) -> str:
        pid = self._uid("ps")
        self.passages[pid] = _Passage(pid, doc_id, ws, ordn, text, list(themes), list(emb))
        return pid

    def insert_sentence(self, passage_id: str, ws: str, ordn: int, text: str, emb: Sequence[float]) -> str:
        sid = self._uid("sn")
        self.sentences[sid] = _Sentence(sid, passage_id, ws, ordn, text, list(emb))
        return sid

    def upsert_concept(self, ws: str, name: str, emb: Sequence[float]) -> str:
        key = (ws, name)
        if key in self._concept_by_name:
            return self._concept_by_name[key]
        cid = self._uid("cn")
        self.concepts[cid] = _Concept(cid, ws, name, list(emb))
        self._concept_by_name[key] = cid
        return cid

    def link_sentence_concept(self, sentence_id: str, concept_id: str, weight: float = 1.0) -> None:
        self.sentence_concept.append((sentence_id, concept_id, float(weight)))

    def link_passage_concept(self, passage_id: str, concept_id: str, weight: float = 1.0) -> None:
        self.passage_concept.append((passage_id, concept_id, float(weight)))

    def upsert_keyword(self, ws: str, term: str, level: str, emb: Sequence[float]) -> str:
        key = (ws, term, level)
        if key in self._keyword_by_term:
            return self._keyword_by_term[key]
        kid = self._uid("kw")
        self.keywords[kid] = _Keyword(kid, ws, term, level, list(emb))
        self._keyword_by_term[key] = kid
        return kid

    def link_passage_keyword(self, passage_id: str, keyword_id: str) -> None:
        self.passage_keyword.append((passage_id, keyword_id))

    def set_passage_themes(self, passage_id: str, themes: List[str]) -> None:
        if passage_id in self.passages:
            self.passages[passage_id].themes = list(themes)

    def add_relation(self, ws: str, src: str, dst: str, weight: float = 1.0) -> None:
        if src == dst:
            return
        a, b = (src, dst) if src < dst else (dst, src)
        key = (ws, a, b)
        self.relations[key] = self.relations.get(key, 0.0) + float(weight)
