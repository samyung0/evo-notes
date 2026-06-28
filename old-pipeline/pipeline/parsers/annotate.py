"""Image annotation (VLM). Lives in the parser layer so engines never see raw
images — only their captions as indexable text."""
from __future__ import annotations

import os
from typing import Tuple

from ..llm.client import LLMClient

_MEDIA = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
}

_llm = LLMClient()


def annotate_image_file(path: str) -> Tuple[str, str]:
    """Return (caption, alt) for an image on disk. Empty when no VLM available."""
    ext = os.path.splitext(path)[1].lower()
    media = _MEDIA.get(ext, "image/png")
    try:
        with open(path, "rb") as fh:
            data = fh.read()
    except OSError:
        return "", ""
    caption = _llm.caption_image(data, media)
    if not caption:
        return "", os.path.basename(path)
    return caption, caption
