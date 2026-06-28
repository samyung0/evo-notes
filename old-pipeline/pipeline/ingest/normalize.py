"""Passage -> sentence normalization. Sentences power LinearRAG's sentence-level
semantic bridging during entity activation."""
from __future__ import annotations

import re
from typing import List

_SENT = re.compile(r"(?<=[.!?])\s+")


def split_sentences(text: str) -> List[str]:
    parts = [s.strip() for s in _SENT.split(text.replace("\n", " ")) if s.strip()]
    # Drop trivially short fragments.
    return [s for s in parts if len(s) >= 12]
