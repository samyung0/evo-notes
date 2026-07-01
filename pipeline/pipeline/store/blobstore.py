"""Resolve a job's ``blobPath`` to a readable local file.

The Go gateway stores uploads through one of two backends and records the
result in ``files.blob_path`` (echoed into the ingest job as ``blobPath``):

* **disk** (local dev): ``blobPath`` is a path on the shared ``/data/blobs``
  volume — already readable, returned unchanged.
* **b2 / s3** (production): ``blobPath`` is an object key. We download it to a
  temp file so the existing readers (``open(...)``) and the Modal parse client
  keep working untouched, then delete it once ingest is done.

``fetch_local`` is synchronous (boto3 + file IO block); the worker calls it via
``asyncio.to_thread`` so the event loop is never blocked.
"""
from __future__ import annotations

import logging
import os
import tempfile
from typing import Callable, Tuple

from ..config import cfg

log = logging.getLogger("evo.blob")

_NOOP: Callable[[], None] = lambda: None  # noqa: E731

_client = None


def _s3_client():
    global _client
    if _client is None:
        import boto3  # imported lazily so disk-only dev needs no boto3 at runtime

        _client = boto3.client(
            "s3",
            endpoint_url=cfg.b2_endpoint or None,
            region_name=cfg.b2_region or None,
            aws_access_key_id=cfg.b2_key_id or None,
            aws_secret_access_key=cfg.b2_app_key or None,
        )
    return _client


def fetch_local(blob_path: str) -> Tuple[str, Callable[[], None]]:
    """Return ``(local_path, cleanup)`` for ``blob_path``.

    Disk backend hands back the shared-volume path with a no-op cleanup. B2/S3
    downloads the object to a temp file; ``cleanup`` deletes it.
    """
    if cfg.blob_backend not in {"b2", "s3"}:
        return blob_path, _NOOP

    fd, tmp = tempfile.mkstemp(prefix="evo_blob_")
    os.close(fd)
    try:
        _s3_client().download_file(cfg.b2_bucket, blob_path, tmp)
    except Exception:
        _safe_unlink(tmp)
        raise

    def _cleanup() -> None:
        _safe_unlink(tmp)

    log.info("downloaded blob %s -> %s", blob_path, tmp)
    return tmp, _cleanup


def _safe_unlink(path: str) -> None:
    try:
        os.unlink(path)
    except OSError:
        log.debug("could not remove temp blob %s", path, exc_info=True)
