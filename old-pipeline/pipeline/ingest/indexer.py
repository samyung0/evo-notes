"""Index a parsed document into a `Corpus`. Reused by the ingest worker (real
uploads, Postgres) and the benchmark harness (datasets, in-memory) so both build
the graph with the identical logic — the prerequisite for a fair engine
comparison."""
from __future__ import annotations

from typing import Dict, List

from ..store.corpus import Corpus
from . import concepts, normalize


def _ensure_concept(corpus: Corpus, embedder, ws: str, name: str, cache: Dict):
    """Return (concept_id, embedding), embedding each concept name once."""
    if name in cache:
        return cache[name]
    emb = embedder.embed([name])[0]
    cid = corpus.upsert_concept(ws, name, emb)
    cache[name] = (cid, emb)
    return cache[name]


def index_document(corpus: Corpus, embedder, ws: str, file_id: str, parser_name: str, passages: List[str], pages: int = 0) -> str:
    """Replace any prior document for file_id and (re)build its corpus rows:
    passages + sentences + concepts + bipartite edges + themes/keywords +
    co-occurrence relations. Returns the new document id."""
    corpus.reset_document(file_id)
    doc_id = corpus.insert_document(file_id, ws, parser_name, pages)
    cache: Dict = {}
    doc_themes: Dict[str, int] = {}

    for i, ptext in enumerate(passages):
        pemb = embedder.embed([ptext])[0]
        pid = corpus.insert_passage(doc_id, ws, i, ptext, [], pemb)

        sents = normalize.split_sentences(ptext)
        if sents:
            s_embs = embedder.embed(sents)
            for j, (stext, semb) in enumerate(zip(sents, s_embs)):
                sid = corpus.insert_sentence(pid, ws, j, stext, semb)
                for cname in concepts.extract_concepts(stext, max_n=4):
                    cid, _ = _ensure_concept(corpus, embedder, ws, cname, cache)
                    corpus.link_sentence_concept(sid, cid)

        pconcepts = concepts.extract_concepts(ptext, max_n=8)
        cids: List[str] = []
        for cname in pconcepts:
            cid, cemb = _ensure_concept(corpus, embedder, ws, cname, cache)
            corpus.link_passage_concept(pid, cid)
            corpus.link_passage_keyword(pid, corpus.upsert_keyword(ws, cname, "low", cemb))
            cids.append(cid)

        themes = pconcepts[:4]
        if themes:
            corpus.set_passage_themes(pid, themes)
            for t in themes:
                doc_themes[t] = doc_themes.get(t, 0) + 1

        for a in range(len(cids)):
            for b in range(a + 1, len(cids)):
                corpus.add_relation(ws, cids[a], cids[b], 1.0)

    for term, _ in sorted(doc_themes.items(), key=lambda kv: -kv[1])[:8]:
        _, emb = _ensure_concept(corpus, embedder, ws, term, cache)
        corpus.upsert_keyword(ws, term, "high", emb)

    return doc_id
