"""Parser interface. A parser turns a source file into a ParsedDoc: ordered
text passages plus annotated images. Image annotation (VLM caption/alt) is the
parser's responsibility so engines see a uniform, text-first document."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Protocol, runtime_checkable


@dataclass
class ParsedImage:
    ref: str               # path or in-doc reference
    caption: str = ""      # VLM caption, indexed as text
    alt: str = ""
    page: int = 0


@dataclass
class ParsedDoc:
    passages: List[str] = field(default_factory=list)
    images: List[ParsedImage] = field(default_factory=list)
    pages: int = 0
    meta: dict = field(default_factory=dict)


@dataclass
class ParseOpts:
    annotate_images: bool = True
    chunk_chars: int = 900


@runtime_checkable
class Parser(Protocol):
    name: str

    def parse(self, path: str, opts: ParseOpts) -> ParsedDoc: ...


def chunk_text(text: str, target: int = 900) -> List[str]:
    """Greedy paragraph-aware chunking to ~target characters."""
    paras = [p.strip() for p in text.replace("\r\n", "\n").split("\n\n") if p.strip()]
    chunks: List[str] = []
    buf = ""
    for p in paras:
        if buf and len(buf) + len(p) + 2 > target:
            chunks.append(buf.strip())
            buf = p
        else:
            buf = f"{buf}\n\n{p}" if buf else p
    if buf.strip():
        chunks.append(buf.strip())
    return chunks
