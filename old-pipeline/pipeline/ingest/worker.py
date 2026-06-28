"""Ingestion worker: claims ingest jobs from the Postgres queue, parses the
uploaded source, indexes it into the RAG corpus, and marks the file ready.

Run: python -m pipeline.ingest.worker   (or the `evo-worker` console script)
"""
from __future__ import annotations

import logging
import time

from ..config import cfg
from ..llm.client import LLMClient
from ..llm.embeddings import get_embedder
from ..parsers import ParseOpts, get_parser
from ..store import db
from ..store.pg import PgCorpus
from . import indexer, lightrag_index

log = logging.getLogger("evo.worker")


def process_job(conn, embedder, llm: LLMClient, job: dict) -> None:
    payload = job["payload"] or {}
    file_id = payload["fileId"]
    ws = payload["workspaceId"]
    blob_path = payload.get("blobPath")
    parser_name = payload.get("parser") or cfg.parser
    engine = payload.get("engine") or cfg.engine

    with conn.cursor() as cur:
        name = db.file_name(cur, file_id)

    parser = get_parser(parser_name)
    doc = parser.parse(blob_path, ParseOpts(chunk_chars=cfg.chunk_chars))
    passages = [p for p in doc.passages if p and p.strip()]
    log.info("parsed %s with %s: %d passages", name, parser.name, len(passages))

    corpus = PgCorpus(conn)
    try:
        doc_id = indexer.index_document(corpus, embedder, ws, file_id, parser.name, passages, doc.pages)
        # LightRAG additionally needs an LLM-extracted graph. Required (no
        # fallback): a missing extraction model raises and fails the job.
        if engine == "lightrag":
            lightrag_index.build(corpus, embedder, llm, ws, file_id, doc_id)
        with conn.cursor() as cur:
            db.set_file_status(cur, file_id, "ready")
            db.add_notification(cur, "system", "Source ready", f"Finished processing {name}.")
            db.set_job(cur, job["id"], "done")
        conn.commit()
    finally:
        corpus.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    embedder = get_embedder()
    llm = LLMClient()
    log.info("worker up — parser=%s engine=%s embedder=%s", cfg.parser, cfg.engine, cfg.embedder)

    while True:
        try:
            with db.connect() as conn:
                with conn.cursor() as cur:
                    job = db.claim_job(cur)
                conn.commit()
                if not job:
                    time.sleep(cfg.poll_interval)
                    continue
                log.info("claimed ingest job %s", job["id"])
                try:
                    process_job(conn, embedder, llm, job)
                    log.info("job %s done", job["id"])
                except Exception as exc:  # noqa: BLE001
                    conn.rollback()
                    log.exception("ingest job %s failed", job["id"])
                    with conn.cursor() as cur:
                        fid = (job.get("payload") or {}).get("fileId")
                        if fid:
                            db.set_file_status(cur, fid, "failed")
                        db.set_job(cur, job["id"], "failed", str(exc)[:500])
                    conn.commit()
        except Exception:  # noqa: BLE001 — keep the worker alive on transient DB errors
            log.exception("worker loop error")
            time.sleep(cfg.poll_interval)


if __name__ == "__main__":
    main()
