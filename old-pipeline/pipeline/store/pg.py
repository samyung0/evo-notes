"""Postgres-backed `Corpus` — the production path.

Holds one psycopg connection (and a long-lived cursor) and delegates every
operation to the SQL helpers in `store.db`, converting query/embedding vectors to
pgvector text literals at the boundary. Keeping the SQL in `store.db` unchanged
means this wrapper carries no extra risk: it is a 1:1 adapter onto the existing,
tested queries.
"""
from __future__ import annotations

from typing import Any, Dict, List, Sequence, Tuple

from ..llm.embeddings import vec_literal
from . import db


class PgCorpus:
    """Adapt a psycopg connection to the `Corpus` protocol.

    A single cursor is reused for the lifetime of the object (one per request in
    the retrieval service, one per job in the worker), so all reads/writes share
    the connection's transaction."""

    def __init__(self, conn) -> None:
        self.conn = conn
        self.cur = conn.cursor()

    def close(self) -> None:
        try:
            self.cur.close()
        except Exception:  # noqa: BLE001 — best-effort cleanup
            pass

    def __enter__(self) -> "PgCorpus":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()

    # ----------------------------------------------------------- reads
    def dense_search(self, ws: str, qvec: Sequence[float], k: int) -> List[Dict[str, Any]]:
        return db.dense_search(self.cur, ws, vec_literal(qvec), k)

    def concept_search(self, ws: str, qvec: Sequence[float], k: int) -> List[Tuple[str, str, float]]:
        return db.concept_search(self.cur, ws, vec_literal(qvec), k)

    def bridged_concepts(self, ws: str, qvec: Sequence[float], k: int) -> List[Tuple[str, float]]:
        return db.bridged_concepts(self.cur, ws, vec_literal(qvec), k)

    def passage_concept_edges(self, ws: str) -> List[Tuple[str, str, float]]:
        return db.passage_concept_edges(self.cur, ws)

    def passages_info(self, ids: Sequence[str]) -> Dict[str, Dict[str, Any]]:
        return db.passages_info(self.cur, list(ids))

    def keyword_search(self, ws: str, qvec: Sequence[float], level: str, k: int) -> List[Tuple[str, str, float]]:
        return db.keyword_search(self.cur, ws, vec_literal(qvec), level, k)

    def passages_for_keywords(self, ws: str, keyword_ids: Sequence[str], limit: int) -> List[Dict[str, Any]]:
        return db.passages_for_keywords(self.cur, ws, list(keyword_ids), limit)

    def relation_neighbors(self, ws: str, concept_ids: Sequence[str]) -> List[Tuple[str, float]]:
        return db.relation_neighbors(self.cur, ws, list(concept_ids))

    def passages_for_concepts(self, ws: str, concept_ids: Sequence[str], limit: int) -> List[Dict[str, Any]]:
        return db.passages_for_concepts(self.cur, ws, list(concept_ids), limit)

    # ------------------------------------------------- reads (LightRAG graph)
    def document_passages(self, doc_id: str) -> List[Tuple[str, str]]:
        return db.document_passages(self.cur, doc_id)

    def entity_search(self, ws: str, qvec: Sequence[float], k: int) -> List[Tuple[str, str, float]]:
        return db.entity_search(self.cur, ws, vec_literal(qvec), k)

    def relation_search(self, ws: str, qvec: Sequence[float], k: int) -> List[Tuple[str, str, str, float]]:
        return db.relation_search(self.cur, ws, vec_literal(qvec), k)

    def relation_neighbors_lr(self, ws: str, entity_ids: Sequence[str]) -> List[Tuple[str, float]]:
        return db.relation_neighbors_lr(self.cur, ws, list(entity_ids))

    def passages_for_entities(self, ws: str, entity_ids: Sequence[str], limit: int) -> List[Dict[str, Any]]:
        return db.passages_for_entities(self.cur, ws, list(entity_ids), limit)

    # ----------------------------------------------------------- writes
    def reset_document(self, file_id: str) -> None:
        db.reset_document(self.cur, file_id)

    def insert_document(self, file_id: str, ws: str, parser: str, pages: int) -> str:
        return db.insert_document(self.cur, file_id, ws, parser, pages)

    def insert_passage(self, doc_id: str, ws: str, ordn: int, text: str, themes: List[str], emb: Sequence[float]) -> str:
        return db.insert_passage(self.cur, doc_id, ws, ordn, text, themes, vec_literal(emb))

    def insert_sentence(self, passage_id: str, ws: str, ordn: int, text: str, emb: Sequence[float]) -> str:
        return db.insert_sentence(self.cur, passage_id, ws, ordn, text, vec_literal(emb))

    def upsert_concept(self, ws: str, name: str, emb: Sequence[float]) -> str:
        return db.upsert_concept(self.cur, ws, name, vec_literal(emb))

    def link_sentence_concept(self, sentence_id: str, concept_id: str, weight: float = 1.0) -> None:
        db.link_sentence_concept(self.cur, sentence_id, concept_id, weight)

    def link_passage_concept(self, passage_id: str, concept_id: str, weight: float = 1.0) -> None:
        db.link_passage_concept(self.cur, passage_id, concept_id, weight)

    def upsert_keyword(self, ws: str, term: str, level: str, emb: Sequence[float]) -> str:
        return db.upsert_keyword(self.cur, ws, term, level, vec_literal(emb))

    def link_passage_keyword(self, passage_id: str, keyword_id: str) -> None:
        db.link_passage_keyword(self.cur, passage_id, keyword_id)

    def set_passage_themes(self, passage_id: str, themes: List[str]) -> None:
        db.set_passage_themes(self.cur, passage_id, themes)

    def add_relation(self, ws: str, src: str, dst: str, weight: float = 1.0) -> None:
        db.add_relation(self.cur, ws, src, dst, weight)

    # ----------------------------------------------- writes (LightRAG graph)
    def reset_lightrag(self, ws: str, file_id: str) -> None:
        db.reset_lightrag(self.cur, ws, file_id)

    def upsert_entity(self, ws: str, name: str, etype: str, description: str, emb: Sequence[float]) -> str:
        return db.upsert_entity(self.cur, ws, name, etype, description, vec_literal(emb))

    def link_passage_entity(self, passage_id: str, entity_id: str, weight: float = 1.0) -> None:
        db.link_passage_entity(self.cur, passage_id, entity_id, weight)

    def add_lr_relation(self, ws: str, src: str, dst: str, description: str, keywords: List[str], weight: float, emb: Sequence[float]) -> None:
        db.add_lr_relation(self.cur, ws, src, dst, description, keywords, weight, vec_literal(emb))
