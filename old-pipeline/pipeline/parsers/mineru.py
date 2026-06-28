"""MinerU parser (stronger PDF/OCR/formula extraction; heavier, often GPU).
Import-guarded; enable with the `mineru` extra. Wired against MinerU's markdown
output so the rest of the pipeline is identical to Docling's path."""
from __future__ import annotations

import os

from .base import ParsedDoc, ParseOpts, chunk_text


class MinerUParser:
    name = "mineru"

    def __init__(self) -> None:
        try:
            import mineru  # type: ignore  # noqa: F401
        except Exception as exc:  # pragma: no cover
            raise RuntimeError(
                "MinerU not installed. `pip install 'evo-pipeline[mineru]'` or set EVO_PARSER=simple."
            ) from exc

    def parse(self, path: str, opts: ParseOpts) -> ParsedDoc:
        # MinerU's high-level API writes markdown + extracted assets. We read the
        # produced markdown and chunk it; image captioning is applied upstream in
        # the worker via annotate when assets are emitted.
        from mineru.cli.common import do_parse  # type: ignore

        out_dir = os.path.join(os.path.dirname(path), "_mineru")
        os.makedirs(out_dir, exist_ok=True)
        md_path = do_parse(path, out_dir)  # returns path to the markdown
        with open(md_path, "r", encoding="utf-8", errors="replace") as fh:
            md = fh.read()
        return ParsedDoc(passages=chunk_text(md, opts.chunk_chars), pages=0, meta={"parser": self.name})
