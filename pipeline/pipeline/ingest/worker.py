"""Ingestion worker.

Claims ingest jobs from the Postgres queue, parses the upload on Modal (GPU
MineRU), feeds the parsed content list into a per-workspace RAGAnything (which
builds the LightRAG knowledge graph in Postgres + AGE), and publishes live
progress to Redis. The Go gateway fans that progress to the browser over SSE.

Run: ``python -m pipeline.ingest.worker``

The whole worker runs on ONE asyncio event loop so the cached LightRAG asyncpg
pools survive across jobs. Synchronous bits (psycopg queue ops, the Modal HTTP
call) are pushed to threads via ``asyncio.to_thread``.
"""
from __future__ import annotations

import asyncio
import logging

from ..config import cfg
from ..store import db, blobstore
from ..rag import mineru_client, progress
from ..rag.cache import RagCache
from ..rag.factory import build_ingest_rag

log = logging.getLogger("evo.worker")


# ----------------------------------------------------------- sync DB helpers
# (run via asyncio.to_thread so the event loop is never blocked)

def _claim_one() -> dict | None:
    with db.connect() as conn:
        with conn.cursor() as cur:
            job = db.claim_job(cur)
        conn.commit()
        return job


def _finish_ok(file_id: str, name: str, job_id: str) -> None:
    with db.connect() as conn:
        with conn.cursor() as cur:
            db.set_file_status(cur, file_id, "ready")
            db.add_notification(cur, "system", "Source ready", f"Finished processing {name}.")
            db.set_job(cur, job_id, "done")
        conn.commit()


def _finish_fail(file_id: str | None, job_id: str, error: str) -> None:
    with db.connect() as conn:
        with conn.cursor() as cur:
            if file_id:
                db.set_file_status(cur, file_id, "failed")
            db.set_job(cur, job_id, "failed", error[:500])
        conn.commit()


def _read_name(file_id: str) -> str:
    with db.connect() as conn:
        with conn.cursor() as cur:
            return db.file_name(cur, file_id)


def _read_text_content(blob_path: str) -> list[dict]:
    """Build a content list directly for plain text/markdown (no GPU needed)."""
    with open(blob_path, "r", encoding="utf-8", errors="replace") as fh:
        text = fh.read()
    return [{"type": "text", "text": text, "page_idx": 0}]


# ----------------------------------------------------------------- pipeline

async def process_job(cache: RagCache, job: dict) -> None:
    payload = job["payload"] or {}
    file_id = payload["fileId"]
    ws = payload["workspaceId"]
    blob_path = payload.get("blobPath")
    kind = (payload.get("kind") or "").lower()

    name = await asyncio.to_thread(_read_name, file_id)
    progress.publish(ws, file_id, "queued", 5)

    # Resolve the stored blobPath to a readable local file. Disk backend returns
    # the shared-volume path unchanged; B2/S3 downloads the object to a temp file.
    local_path, blob_cleanup = await asyncio.to_thread(blobstore.fetch_local, blob_path)

    image_dir: str | None = None
    try:
        # 1. Obtain a MinerU-style content list. Plain text/markdown is trivial
        #    and skips the GPU; everything else is parsed on Modal (GPU MineRU).
        progress.publish(ws, file_id, "parsing", 15)
        if kind in {"txt", "md"}:
            content_list = await asyncio.to_thread(_read_text_content, local_path)
        else:
            content_list, image_dir = await asyncio.to_thread(
                mineru_client.parse, local_path, name
            )
        progress.publish(ws, file_id, "parsed", 45)

        # 2. Build / fetch the workspace's RAGAnything and ingest.
        rag = await cache.get(ws)
        progress.publish(ws, file_id, "indexing", 55)
        await rag.insert_content_list(
            content_list, file_path=name, doc_id=file_id
        )
        progress.publish(ws, file_id, "indexing", 90)

        # 3. Mark ready + notify + close the job.
        await asyncio.to_thread(_finish_ok, file_id, name, job["id"])
        progress.publish(ws, file_id, "done", 100, status="ready")
    finally:
        await asyncio.to_thread(mineru_client.cleanup, image_dir)
        await asyncio.to_thread(blob_cleanup)


async def main_async() -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s"
    )
    cache = RagCache(build_ingest_rag, maxsize=cfg.lightrag_cache_size)
    log.info(
        "worker up — ingest_model=%s embedding=%s modal=%s",
        cfg.ingest_model,
        cfg.embedding_model,
        cfg.modal_parse_url or "(unset)",
    )

    try:
        while True:
            try:
                job = await asyncio.to_thread(_claim_one)
            except Exception:  # noqa: BLE001 — survive transient DB errors
                log.exception("claim error")
                await asyncio.sleep(cfg.poll_interval)
                continue

            if not job:
                await asyncio.sleep(cfg.poll_interval)
                continue

            log.info("claimed ingest job %s", job["id"])
            payload = job.get("payload") or {}
            try:
                await process_job(cache, job)
                log.info("job %s done", job["id"])
            except Exception as exc:  # noqa: BLE001
                log.exception("ingest job %s failed", job["id"])
                fid = payload.get("fileId")
                ws = payload.get("workspaceId")
                try:
                    await asyncio.to_thread(_finish_fail, fid, job["id"], str(exc))
                except Exception:  # noqa: BLE001
                    log.exception("failed to record job failure")
                if ws and fid:
                    progress.publish(ws, fid, "failed", 100, status="failed", message=str(exc)[:200])
    finally:
        await cache.close()


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
