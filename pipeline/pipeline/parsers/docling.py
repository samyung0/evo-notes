"""Docling parser (CPU-friendly, strong layout/table handling). Import-guarded
so the package installs without it; enable with the `docling` extra."""
from __future__ import annotations

from .base import ParsedDoc, ParseOpts, chunk_text


class DoclingParser:
    name = "docling"

    def __init__(self) -> None:
        try:
            from docling.document_converter import DocumentConverter  # type: ignore
        except Exception as exc:  # pragma: no cover
            raise RuntimeError(
                "Docling not installed. `pip install 'evo-pipeline[docling]'` or set EVO_PARSER=simple."
            ) from exc
        self._converter = DocumentConverter()

    def parse(self, path: str, opts: ParseOpts) -> ParsedDoc:
        result = self._converter.convert(path)
        doc = result.document
        # Markdown export preserves headings/tables/reading order; chunk it.
        md = doc.export_to_markdown()
        pages = len(getattr(doc, "pages", []) or []) or 1
        return ParsedDoc(passages=chunk_text(md, opts.chunk_chars), pages=pages, meta={"parser": self.name})
