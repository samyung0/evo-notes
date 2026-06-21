"""Thin psycopg helpers over the shared Postgres. Vectors are passed as text
literals cast to ::vector, so no extra pgvector adapter is required."""
from __future__ import annotations

import os
import secrets
from typing import Any, Dict, List, Optional

import psycopg

from ..config import cfg


def connect(autocommit: bool = False) -> psycopg.Connection:
    return psycopg.connect(cfg.dsn, autocommit=autocommit)


def uid(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(5)}"


# ---------------------------------------------------------------- job queue

def claim_job(cur) -> Optional[Dict[str, Any]]:
    """Claim one pending ingest job atomically (FOR UPDATE SKIP LOCKED)."""
    cur.execute(
        """
        UPDATE jobs SET status='running', locked_at=now(), updated_at=now(), attempts=attempts+1
        WHERE id = (
            SELECT id FROM jobs WHERE status='pending'
            ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1
        )
        RETURNING id, type, payload
        """
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "type": row[1], "payload": row[2]}


def set_job(cur, job_id: str, status: str, error: Optional[str] = None) -> None:
    cur.execute(
        "UPDATE jobs SET status=%s, error=%s, updated_at=now() WHERE id=%s",
        (status, error, job_id),
    )


def set_file_status(cur, file_id: str, status: str) -> None:
    cur.execute("UPDATE files SET status=%s WHERE id=%s", (status, file_id))


# ---------------------------------------------------------------- corpus writes

def reset_document(cur, file_id: str) -> None:
    """Drop any previous document (and cascaded passages/sentences) for re-ingest."""
    cur.execute("DELETE FROM documents WHERE file_id=%s", (file_id,))


def insert_document(cur, file_id: str, workspace_id: str, parser: str, pages: int) -> str:
    doc_id = uid("doc")
    cur.execute(
        "INSERT INTO documents (id, file_id, workspace_id, parser, status, pages) VALUES (%s,%s,%s,%s,'ready',%s)",
        (doc_id, file_id, workspace_id, parser, pages),
    )
    return doc_id


def insert_passage(cur, doc_id: str, ws: str, ordn: int, text: str, themes: List[str], emb: str) -> str:
    pid = uid("ps")
    cur.execute(
        "INSERT INTO passages (id, document_id, workspace_id, ord, text, themes, embedding) VALUES (%s,%s,%s,%s,%s,%s,%s::vector)",
        (pid, doc_id, ws, ordn, text, themes, emb),
    )
    return pid


def insert_sentence(cur, passage_id: str, ws: str, ordn: int, text: str, emb: str) -> str:
    sid = uid("sn")
    cur.execute(
        "INSERT INTO sentences (id, passage_id, workspace_id, ord, text, embedding) VALUES (%s,%s,%s,%s,%s,%s::vector)",
        (sid, passage_id, ws, ordn, text, emb),
    )
    return sid


def upsert_concept(cur, ws: str, name: str, emb: str) -> str:
    cur.execute(
        """
        INSERT INTO concepts (id, workspace_id, canonical_name, embedding)
        VALUES (%s,%s,%s,%s::vector)
        ON CONFLICT (workspace_id, canonical_name) DO UPDATE SET canonical_name=EXCLUDED.canonical_name
        RETURNING id
        """,
        (uid("cn"), ws, name, emb),
    )
    return cur.fetchone()[0]


def link_passage_concept(cur, passage_id: str, concept_id: str, weight: float = 1.0, engine: str = "shared") -> None:
    cur.execute(
        "INSERT INTO passage_concept (passage_id, concept_id, weight, engine) VALUES (%s,%s,%s,%s) ON CONFLICT DO NOTHING",
        (passage_id, concept_id, weight, engine),
    )


def link_sentence_concept(cur, sentence_id: str, concept_id: str, weight: float = 1.0) -> None:
    cur.execute(
        "INSERT INTO sentence_concept (sentence_id, concept_id, weight) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING",
        (sentence_id, concept_id, weight),
    )


def set_passage_themes(cur, passage_id: str, themes: List[str]) -> None:
    cur.execute("UPDATE passages SET themes=%s WHERE id=%s", (themes, passage_id))


def upsert_keyword(cur, ws: str, term: str, level: str, emb: str) -> str:
    cur.execute(
        """
        INSERT INTO keywords (id, workspace_id, term, level, embedding)
        VALUES (%s,%s,%s,%s,%s::vector)
        ON CONFLICT (workspace_id, term, level) DO UPDATE SET term=EXCLUDED.term
        RETURNING id
        """,
        (uid("kw"), ws, term, level, emb),
    )
    return cur.fetchone()[0]


def link_passage_keyword(cur, passage_id: str, keyword_id: str) -> None:
    cur.execute(
        "INSERT INTO passage_keyword (passage_id, keyword_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
        (passage_id, keyword_id),
    )


def add_relation(cur, ws: str, src: str, dst: str, weight: float = 1.0) -> None:
    if src == dst:
        return
    a, b = (src, dst) if src < dst else (dst, src)  # symmetric co-occurrence
    cur.execute(
        """
        INSERT INTO relations (workspace_id, src_concept_id, dst_concept_id, weight)
        VALUES (%s,%s,%s,%s)
        ON CONFLICT (workspace_id, src_concept_id, dst_concept_id)
        DO UPDATE SET weight = relations.weight + EXCLUDED.weight
        """,
        (ws, a, b, weight),
    )


def add_notification(cur, kind: str, title: str, body: str) -> None:
    cur.execute(
        "INSERT INTO notifications (id, kind, title, body) VALUES (%s,%s,%s,%s)",
        (uid("nt"), kind, title, body),
    )


def file_name(cur, file_id: str) -> str:
    cur.execute("SELECT name FROM files WHERE id=%s", (file_id,))
    row = cur.fetchone()
    return row[0] if row else file_id


# ---------------------------------------------------------------- generation ctx

def workspace_passages(cur, ws: str, limit: int = 24) -> List[Dict[str, Any]]:
    """A spread of passages across the workspace, used as generation context."""
    cur.execute(
        """
        SELECT p.id, p.text, d.file_id, f.name
        FROM passages p
        JOIN documents d ON d.id = p.document_id
        JOIN files f ON f.id = d.file_id
        WHERE p.workspace_id = %s
        ORDER BY p.document_id, p.ord
        LIMIT %s
        """,
        (ws, limit),
    )
    return [{"passageId": pid, "text": t, "fileId": fid, "fileName": fname} for pid, t, fid, fname in cur.fetchall()]


# ---------------------------------------------------------------- retrieval

def dense_search(cur, ws: str, query_emb: str, k: int) -> List[Dict[str, Any]]:
    cur.execute(
        """
        SELECT p.id, p.text, d.file_id, f.name, 1 - (p.embedding <=> %s::vector) AS score
        FROM passages p
        JOIN documents d ON d.id = p.document_id
        JOIN files f ON f.id = d.file_id
        WHERE p.workspace_id = %s AND p.embedding IS NOT NULL
        ORDER BY p.embedding <=> %s::vector ASC
        LIMIT %s
        """,
        (query_emb, ws, query_emb, k),
    )
    out = []
    for pid, text, file_id, fname, score in cur.fetchall():
        out.append({"passageId": pid, "text": text, "fileId": file_id, "fileName": fname, "score": float(score)})
    return out


# ------------------------------------------------------- graph retrieval (LinearRAG)

def concept_search(cur, ws: str, query_emb: str, k: int):
    """Concepts most similar to the query — the seed for entity activation."""
    cur.execute(
        """
        SELECT id, canonical_name, 1 - (embedding <=> %s::vector) AS score
        FROM concepts WHERE workspace_id=%s AND embedding IS NOT NULL
        ORDER BY embedding <=> %s::vector LIMIT %s
        """,
        (query_emb, ws, query_emb, k),
    )
    return [(cid, name, float(score)) for cid, name, score in cur.fetchall()]


def bridged_concepts(cur, ws: str, query_emb: str, k: int):
    """Sentence-level semantic bridging: concepts of the query's nearest
    sentences, weighted by sentence similarity x edge weight."""
    cur.execute(
        """
        SELECT sc.concept_id, sum((1 - (s.embedding <=> %s::vector)) * sc.weight) AS w
        FROM sentences s
        JOIN sentence_concept sc ON sc.sentence_id = s.id
        WHERE s.id IN (
            SELECT id FROM sentences WHERE workspace_id=%s AND embedding IS NOT NULL
            ORDER BY embedding <=> %s::vector LIMIT %s
        )
        GROUP BY sc.concept_id
        """,
        (query_emb, ws, query_emb, k),
    )
    return [(cid, float(w)) for cid, w in cur.fetchall()]


def passage_concept_edges(cur, ws: str):
    cur.execute(
        """
        SELECT pc.passage_id, pc.concept_id, pc.weight
        FROM passage_concept pc
        JOIN passages p ON p.id = pc.passage_id
        WHERE p.workspace_id=%s AND pc.engine='shared'
        """,
        (ws,),
    )
    return [(pid, cid, float(w)) for pid, cid, w in cur.fetchall()]


def passages_info(cur, ids: List[str]) -> Dict[str, Any]:
    if not ids:
        return {}
    cur.execute(
        """
        SELECT p.id, p.text, d.file_id, f.name, p.themes
        FROM passages p
        JOIN documents d ON d.id = p.document_id
        JOIN files f ON f.id = d.file_id
        WHERE p.id = ANY(%s)
        """,
        (ids,),
    )
    return {
        r[0]: {"passageId": r[0], "text": r[1], "fileId": r[2], "fileName": r[3], "themes": r[4] or []}
        for r in cur.fetchall()
    }


# ------------------------------------------------------- dual-level (LightRAG)

def keyword_search(cur, ws: str, query_emb: str, level: str, k: int):
    cur.execute(
        """
        SELECT id, term, 1 - (embedding <=> %s::vector) AS score
        FROM keywords WHERE workspace_id=%s AND level=%s AND embedding IS NOT NULL
        ORDER BY embedding <=> %s::vector LIMIT %s
        """,
        (query_emb, ws, level, query_emb, k),
    )
    return [(kid, term, float(score)) for kid, term, score in cur.fetchall()]


def passages_for_keywords(cur, ws: str, keyword_ids: List[str], limit: int):
    if not keyword_ids:
        return []
    cur.execute(
        """
        SELECT p.id, p.text, d.file_id, f.name, count(*) AS hits
        FROM passages p
        JOIN passage_keyword pk ON pk.passage_id = p.id
        JOIN documents d ON d.id = p.document_id
        JOIN files f ON f.id = d.file_id
        WHERE p.workspace_id=%s AND pk.keyword_id = ANY(%s)
        GROUP BY p.id, p.text, d.file_id, f.name
        ORDER BY hits DESC LIMIT %s
        """,
        (ws, keyword_ids, limit),
    )
    return [{"passageId": r[0], "text": r[1], "fileId": r[2], "fileName": r[3], "hits": int(r[4])} for r in cur.fetchall()]


def relation_neighbors(cur, ws: str, concept_ids: List[str]):
    if not concept_ids:
        return []
    cur.execute(
        """
        SELECT CASE WHEN src_concept_id = ANY(%s) THEN dst_concept_id ELSE src_concept_id END AS nbr, weight
        FROM relations
        WHERE workspace_id=%s AND (src_concept_id = ANY(%s) OR dst_concept_id = ANY(%s))
        """,
        (concept_ids, ws, concept_ids, concept_ids),
    )
    return [(r[0], float(r[1])) for r in cur.fetchall()]


def passages_for_concepts(cur, ws: str, concept_ids: List[str], limit: int):
    if not concept_ids:
        return []
    cur.execute(
        """
        SELECT p.id, p.text, d.file_id, f.name, sum(pc.weight) AS w
        FROM passages p
        JOIN passage_concept pc ON pc.passage_id = p.id
        JOIN documents d ON d.id = p.document_id
        JOIN files f ON f.id = d.file_id
        WHERE p.workspace_id=%s AND pc.concept_id = ANY(%s) AND pc.engine='shared'
        GROUP BY p.id, p.text, d.file_id, f.name
        ORDER BY w DESC LIMIT %s
        """,
        (ws, concept_ids, limit),
    )
    return [{"passageId": r[0], "text": r[1], "fileId": r[2], "fileName": r[3], "w": float(r[4])} for r in cur.fetchall()]


# ---------------------------------------------------------------- benchmark

def create_workspace_min(cur, ws_id: str, name: str = "Benchmark") -> None:
    cur.execute(
        "INSERT INTO workspaces (id, name, color, privacy) VALUES (%s,%s,'graphite','private') ON CONFLICT (id) DO NOTHING",
        (ws_id, name),
    )


def create_file_min(cur, file_id: str, ws_id: str, name: str) -> None:
    cur.execute(
        "INSERT INTO files (id, workspace_id, name, kind, status) VALUES (%s,%s,%s,'txt','ready') ON CONFLICT (id) DO NOTHING",
        (file_id, ws_id, name),
    )


def purge_workspace(cur, ws_id: str) -> None:
    """Tear down a benchmark workspace and all its corpus rows."""
    cur.execute("DELETE FROM keywords WHERE workspace_id=%s", (ws_id,))
    cur.execute("DELETE FROM concepts WHERE workspace_id=%s", (ws_id,))  # cascades relations + edges
    cur.execute("DELETE FROM workspaces WHERE id=%s", (ws_id,))  # cascades files->documents->passages


# Ensure BLOB_DIR exists for callers that read uploads.
os.makedirs(cfg.blob_dir, exist_ok=True)
