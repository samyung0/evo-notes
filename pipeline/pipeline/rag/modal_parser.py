"""Custom LightRAG parser engine backed by the Modal-hosted MineRU GPU service.

LightRAG v1.5 (post RAG-Anything merge) routes document parsing through a
parser registry. This module registers an ``evo "modal"`` engine that:

1. POSTs the source upload to Modal's ``/file_parse`` endpoint (a thin
   wrapper around GPU MineRU, defined in ``modal/mineru_app.py``), which
   returns ``{"content_list": [...], "images": {name: b64}, "md": "..."}``;
2. materializes that response as a MinerU-style raw bundle on disk
   (``content_list.json`` + ``images/``), so
3. ``build_ir`` can reuse LightRAG's own :class:`MinerUIRBuilder` verbatim —
   headings, tables, equations, images and page/bbox positions all flow into
   the standard sidecar and from there into the i/t/e multimodal pipeline.

The engine plugs into :class:`ExternalParserBase`, which supplies the shared
raw-bundle cache / sidecar / full_docs persistence template used by the
built-in MinerU and Docling engines.
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
from collections.abc import Mapping
from pathlib import Path
from typing import Any, TYPE_CHECKING

import requests

from lightrag.parser.external._base import ExternalParserBase
from lightrag.parser.registry import ParserSpec, register_parser

from ..config import cfg

if TYPE_CHECKING:
    from lightrag.sidecar.ir import IRDoc

log = logging.getLogger("evo.rag.modal_parser")

PARSER_ENGINE_MODAL = "modal"
_SIGNATURE_FILENAME = "evo_modal_signature.json"

# Everything the Modal MineRU service can rasterize/OCR. Plain text formats
# (txt/md) never reach this engine — the worker inserts those as RAW text.
_MODAL_SUFFIXES = frozenset(
    {
        "pdf",
        "doc",
        "docx",
        "ppt",
        "pptx",
        "xls",
        "xlsx",
        "png",
        "jpg",
        "jpeg",
        "jp2",
        "webp",
        "gif",
        "bmp",
    }
)


class ModalParseError(RuntimeError):
    pass


def _bundle_signature(source_path: Path) -> dict[str, Any]:
    """Cache signature for a raw bundle: source identity + parse params."""
    stat = source_path.stat()
    return {
        "source_size": stat.st_size,
        "source_mtime_ns": stat.st_mtime_ns,
        "parse_method": cfg.parse_method,
        "url": cfg.modal_parse_url,
    }


def _request_payload(source_path: Path, upload_name: str) -> dict[str, Any]:
    """POST the source to Modal and return the parsed JSON payload.

    Isolated from bundle writing so tests can record/replay this single
    network call (the only expensive, non-deterministic step) by patching this
    function — see ``pipeline/tests/README.md``.
    """
    if not cfg.modal_parse_url:
        raise ModalParseError("MODAL_PARSE_URL is not configured")

    headers = {}
    if cfg.modal_parse_token:
        headers["Authorization"] = f"Bearer {cfg.modal_parse_token}"

    with open(source_path, "rb") as fh:
        resp = requests.post(
            cfg.modal_parse_url,
            headers=headers,
            files={"file": (upload_name, fh)},
            data={"parse_method": cfg.parse_method, "filename": upload_name},
            timeout=cfg.modal_parse_timeout,
        )
    if resp.status_code >= 300:
        raise ModalParseError(f"modal parse {resp.status_code}: {resp.text[:500]}")
    return resp.json()


def _fetch_bundle_sync(source_path: Path, upload_name: str, raw_dir: Path) -> None:
    """Fetch the Modal payload and write a MinerU-style raw bundle into ``raw_dir``.

    Blocking (requests + file IO); run via ``asyncio.to_thread``.
    """
    payload = _request_payload(source_path, upload_name)
    content_list: list[dict[str, Any]] = payload.get("content_list") or []
    images: dict[str, str] = payload.get("images") or {}

    images_dir = raw_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    written: set[str] = set()
    for name, b64 in images.items():
        safe = os.path.basename(name)
        if not safe:
            continue
        try:
            (images_dir / safe).write_bytes(base64.b64decode(b64))
            written.add(safe)
        except Exception:  # noqa: BLE001 — a broken image must not kill the parse
            log.warning("failed writing extracted image %s", name, exc_info=True)

    # Point every image block at the bundle-relative location we just wrote so
    # MinerUIRBuilder's safe asset resolver finds the bytes inside raw_dir.
    for item in content_list:
        if isinstance(item, dict) and item.get("type") == "image":
            img = item.get("img_path")
            if isinstance(img, str) and img:
                basename = os.path.basename(img)
                if basename in written:
                    item["img_path"] = f"images/{basename}"

    (raw_dir / "content_list.json").write_text(
        json.dumps(content_list, ensure_ascii=False), encoding="utf-8"
    )
    (raw_dir / _SIGNATURE_FILENAME).write_text(
        json.dumps(_bundle_signature(source_path)), encoding="utf-8"
    )
    log.info(
        "parsed %s -> %d blocks, %d images", upload_name, len(content_list), len(written)
    )


class ModalParser(ExternalParserBase):
    """MinerU-on-Modal engine speaking our custom ``/file_parse`` contract."""

    engine_name = PARSER_ENGINE_MODAL
    raw_dir_suffix = ".modal_raw"
    force_reparse_env = "EVO_FORCE_REPARSE_MODAL"

    def is_bundle_valid(
        self,
        raw_dir: Path,
        source_path: Path,
        *,
        engine_params: Mapping[str, Any] | None = None,
    ) -> bool:
        if not (raw_dir / "content_list.json").is_file():
            return False
        sig_path = raw_dir / _SIGNATURE_FILENAME
        try:
            recorded = json.loads(sig_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return False
        return recorded == _bundle_signature(source_path)

    async def download_into(
        self,
        raw_dir: Path,
        source_path: Path,
        *,
        upload_name: str,
        engine_params: Mapping[str, Any] | None = None,
    ) -> None:
        await asyncio.to_thread(_fetch_bundle_sync, source_path, upload_name, raw_dir)

    def build_ir(self, raw_dir: Path, document_name: str) -> "IRDoc":
        from lightrag.parser.external.mineru import MinerUIRBuilder

        return MinerUIRBuilder().normalize_from_workdir(
            raw_dir, document_name=document_name
        )


def register_modal_parser() -> None:
    """Register the engine with LightRAG's parser registry (idempotent)."""
    register_parser(
        ParserSpec(
            engine_name=PARSER_ENGINE_MODAL,
            impl="pipeline.rag.modal_parser:ModalParser",
            suffixes=_MODAL_SUFFIXES,
            queue_group=PARSER_ENGINE_MODAL,
            concurrency=int(os.getenv("MAX_PARALLEL_PARSE_MODAL", "2")),
            endpoint_configured=lambda: bool(cfg.modal_parse_url),
            endpoint_requirement=lambda: "MODAL_PARSE_URL",
        )
    )
