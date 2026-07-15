"""Client for the free MinerU "Agent lightweight" parse API (mineru.net).

No auth token — the API is IP rate-limited (HTTP 429 when throttled). Flow:

1. ``POST {base}/parse/file`` with the file name + options → ``task_id`` and a
   signed OSS upload URL (``file_url``)
2. ``PUT`` the raw bytes to ``file_url``
3. Poll ``GET {base}/parse/{task_id}`` until ``done`` / ``failed``
4. Download the markdown from ``data.markdown_url``

Upstream limits (the Go gateway pre-validates size/type at upload time):
≤ 10 MB, ≤ 20 pages; PDF, images (png/jpg/jpeg/jp2/webp/gif/bmp), docx,
pptx, xlsx. OCR language packs are limited — the default ``ch`` pack covers
Chinese + English only.

Synchronous (requests); the worker calls it via ``asyncio.to_thread``.
"""
from __future__ import annotations

import logging
import time
from typing import Callable, Optional

import requests

from ..config import cfg

log = logging.getLogger("evo.rag.mineru_lite")

_POLL_INTERVAL = 3.0


class MineruLiteError(RuntimeError):
    pass


def _check(resp: requests.Response) -> dict:
    if resp.status_code == 429:
        raise MineruLiteError("MinerU lightweight API rate limit hit; retry later")
    resp.raise_for_status()
    body = resp.json()
    if body.get("code") != 0:
        raise MineruLiteError(
            f"MinerU lite API error {body.get('code')}: {body.get('msg')}"
        )
    return body.get("data") or {}


def parse_file(
    local_path: str,
    file_name: str,
    on_progress: Optional[Callable[[int], None]] = None,
) -> str:
    """Parse a document with the MinerU lightweight API and return markdown.

    ``on_progress`` receives coarse percentages (25–55) suitable for the SSE
    parsing band; it is invoked from the calling (worker) thread.
    """
    base = cfg.mineru_lite_base.rstrip("/")

    # 1. Create the task; the response carries the signed OSS upload URL.
    data = _check(
        requests.post(
            f"{base}/parse/file",
            json={
                "file_name": file_name,
                "language": cfg.mineru_lite_language,
                "enable_table": True,
                "is_ocr": True,
                "enable_formula": True,
            },
            timeout=30,
        )
    )
    task_id = data["task_id"]
    file_url = data["file_url"]
    log.info("mineru lite task %s created for %s", task_id, file_name)

    # 2. Upload the bytes (per MinerU docs: plain PUT, no Content-Type needed).
    with open(local_path, "rb") as fh:
        put = requests.put(file_url, data=fh, timeout=120)
    if put.status_code not in (200, 201):
        raise MineruLiteError(f"file upload failed: HTTP {put.status_code}")
    if on_progress:
        on_progress(25)

    # 3. Poll until done/failed, then download the markdown result.
    deadline = time.monotonic() + cfg.mineru_lite_timeout
    pct = 25
    while time.monotonic() < deadline:
        time.sleep(_POLL_INTERVAL)
        data = _check(requests.get(f"{base}/parse/{task_id}", timeout=30))
        state = data.get("state")
        if state == "done":
            md = requests.get(data["markdown_url"], timeout=120)
            md.raise_for_status()
            md.encoding = "utf-8"
            text = md.text
            if not text.strip():
                raise MineruLiteError("parse produced empty markdown")
            if on_progress:
                on_progress(55)
            return text
        if state == "failed":
            raise MineruLiteError(
                f"lightweight parse failed ({data.get('err_code')}): "
                f"{data.get('err_msg') or 'unknown error'}"
            )
        # waiting-file / uploading / pending / running — inch the bar forward.
        pct = min(50, pct + 2)
        if on_progress:
            on_progress(pct)

    raise MineruLiteError(
        f"lightweight parse timed out after {cfg.mineru_lite_timeout}s (task {task_id})"
    )
