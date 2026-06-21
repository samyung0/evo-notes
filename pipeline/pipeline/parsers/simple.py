"""Dependency-free fallback parser: text/markdown directly, PDFs via pypdf when
installed, images via VLM caption. Lets the whole pipeline run without the heavy
Docling/MinerU stacks (and is the graceful fallback when they're absent)."""
from __future__ import annotations

import os
from typing import List

from .annotate import annotate_image_file
from .base import ParsedDoc, ParsedImage, ParseOpts, chunk_text


class SimpleParser:
    name = "simple"

    def parse(self, path: str, opts: ParseOpts) -> ParsedDoc:
        ext = os.path.splitext(path)[1].lower()
        if ext in (".md", ".markdown", ".txt", ""):
            return self._text(path, opts)
        if ext == ".pdf":
            return self._pdf(path, opts)
        if ext in (".png", ".jpg", ".jpeg", ".gif", ".webp"):
            return self._image(path, opts)
        # Unknown: best-effort read as text.
        return self._text(path, opts)

    def _text(self, path: str, opts: ParseOpts) -> ParsedDoc:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            raw = fh.read()
        return ParsedDoc(passages=chunk_text(raw, opts.chunk_chars), pages=1, meta={"parser": self.name})

    def _pdf(self, path: str, opts: ParseOpts) -> ParsedDoc:
        try:
            from pypdf import PdfReader  # type: ignore
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("PDF parsing needs the `pdf` extra (pip install 'evo-pipeline[pdf]')") from exc
        reader = PdfReader(path)
        parts: List[str] = []
        for page in reader.pages:
            txt = page.extract_text() or ""
            if txt.strip():
                parts.append(txt)
        full = "\n\n".join(parts)
        return ParsedDoc(passages=chunk_text(full, opts.chunk_chars), pages=len(reader.pages), meta={"parser": self.name})

    def _image(self, path: str, opts: ParseOpts) -> ParsedDoc:
        caption, alt = ("", "")
        if opts.annotate_images:
            caption, alt = annotate_image_file(path)
        passages = [caption] if caption else []
        return ParsedDoc(
            passages=passages,
            images=[ParsedImage(ref=path, caption=caption, alt=alt)],
            pages=1,
            meta={"parser": self.name},
        )
