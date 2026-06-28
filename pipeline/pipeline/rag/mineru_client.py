"""Client for the Modal-hosted MineRU GPU parse service.

The worker POSTs a raw upload to Modal's ``/file_parse`` endpoint and gets back a
normalized JSON payload (defined by ``modal/mineru_app.py``)::

    {"content_list": [...MinerU blocks...],
     "images": {"<name>": "<base64 png>"},
     "md": "<markdown>"}

Extracted images are written to a temp dir and each block's ``img_path`` is
rewritten to an absolute local path so RAG-Anything's ``ImageModalProcessor`` can
base64 them for the Gemini caption model. ``page_idx`` is preserved for
page-level citation.
"""
from __future__ import annotations

import base64
import logging
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Tuple

import requests

from ..config import cfg

log = logging.getLogger("evo.rag.mineru")


class MineruParseError(RuntimeError):
    pass


def parse(blob_path: str, file_name: str, timeout: int = 600) -> Tuple[List[Dict[str, Any]], str]:
    """Parse a document on Modal. Returns (content_list, image_dir).

    The caller owns ``image_dir`` and should delete it after ingest.
    """
    if not cfg.modal_parse_url:
        raise MineruParseError("MODAL_PARSE_URL is not configured")

    headers = {}
    if cfg.modal_parse_token:
        headers["Authorization"] = f"Bearer {cfg.modal_parse_token}"

    with open(blob_path, "rb") as fh:
        resp = requests.post(
            cfg.modal_parse_url,
            headers=headers,
            files={"file": (file_name, fh)},
            data={"parse_method": cfg.parse_method, "filename": file_name},
            timeout=timeout,
        )
    if resp.status_code >= 300:
        raise MineruParseError(f"modal parse {resp.status_code}: {resp.text[:500]}")

    payload = resp.json()
    content_list: List[Dict[str, Any]] = payload.get("content_list") or []
    images: Dict[str, str] = payload.get("images") or {}

    image_dir = tempfile.mkdtemp(prefix="evo_mineru_")
    name_to_path: Dict[str, str] = {}
    for name, b64 in images.items():
        safe = os.path.basename(name)
        dst = os.path.join(image_dir, safe)
        try:
            with open(dst, "wb") as out:
                out.write(base64.b64decode(b64))
            name_to_path[safe] = dst
        except Exception:  # noqa: BLE001
            log.warning("failed writing extracted image %s", name, exc_info=True)

    # Rewrite img_path on image blocks to the absolute local path we just wrote.
    for item in content_list:
        if not isinstance(item, dict):
            continue
        if item.get("type") == "image":
            img = item.get("img_path")
            if isinstance(img, str) and img:
                local = name_to_path.get(os.path.basename(img))
                if local:
                    item["img_path"] = local

    log.info(
        "parsed %s -> %d blocks, %d images", file_name, len(content_list), len(name_to_path)
    )
    return content_list, image_dir


def cleanup(image_dir: str | None) -> None:
    if not image_dir:
        return
    try:
        for p in Path(image_dir).glob("*"):
            p.unlink(missing_ok=True)
        os.rmdir(image_dir)
    except Exception:  # noqa: BLE001
        log.debug("cleanup of %s failed", image_dir, exc_info=True)
