"""LLM/VLM client. Defaults to Anthropic Claude; degrades to extractive
fallbacks when no API key / SDK is present so the pipeline still runs."""
from __future__ import annotations

import base64
from typing import Optional

from ..config import cfg


class LLMClient:
    def __init__(self) -> None:
        self._client = None
        if cfg.anthropic_key:
            try:
                import anthropic  # type: ignore

                self._client = anthropic.Anthropic(api_key=cfg.anthropic_key)
            except Exception:
                self._client = None

    @property
    def available(self) -> bool:
        return self._client is not None

    def complete(self, prompt: str, system: str = "", model: Optional[str] = None, max_tokens: int = 1024) -> str:
        if not self._client:
            return ""  # caller provides an extractive fallback
        msg = self._client.messages.create(
            model=model or cfg.llm_model,
            max_tokens=max_tokens,
            system=system or "You are a helpful study assistant.",
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")

    def caption_image(self, image_bytes: bytes, media_type: str = "image/png") -> str:
        """Return a short caption/alt-text for an image (VLM). Empty if no LLM."""
        if not self._client:
            return ""
        b64 = base64.standard_b64encode(image_bytes).decode()
        msg = self._client.messages.create(
            model=cfg.vlm_model,
            max_tokens=160,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                        {"type": "text", "text": "Describe this figure for a study index in one concise sentence."},
                    ],
                }
            ],
        )
        return "".join(b.text for b in msg.content if getattr(b, "type", "") == "text").strip()
