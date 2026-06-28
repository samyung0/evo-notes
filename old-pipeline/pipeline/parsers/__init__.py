"""Parser registry. Selected by config/job payload; falls back to the
dependency-free SimpleParser when a heavy backend isn't installed so ingestion
never hard-fails in dev."""
from __future__ import annotations

import logging

from .base import ParsedDoc, ParsedImage, ParseOpts, Parser, chunk_text
from .simple import SimpleParser

log = logging.getLogger("evo.parsers")

__all__ = ["ParsedDoc", "ParsedImage", "ParseOpts", "Parser", "chunk_text", "get_parser"]


def get_parser(name: str) -> Parser:
    name = (name or "simple").lower()
    try:
        if name == "docling":
            from .docling import DoclingParser

            return DoclingParser()
        if name == "mineru":
            from .mineru import MinerUParser

            return MinerUParser()
    except RuntimeError as exc:
        log.warning("parser %s unavailable (%s); falling back to 'simple'", name, exc)
    return SimpleParser()
