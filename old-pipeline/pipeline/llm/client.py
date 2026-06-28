"""Role-based, multi-provider LLM/VLM client.

Each logical role (retrieval / extraction / keywords / image_caption /
enrichment) routes to a provider + model defined in ``cfg.models``. OpenRouter
and DeepSeek are reached through the OpenAI-compatible ``openai`` SDK (pointed at
the provider's base_url); Gemini through ``google-genai``. The optional Anthropic
SDK is still honoured when a role routes to the ``anthropic`` provider.

When a role's provider is not configured (no key / SDK), calls degrade to ``""``
(or ``[]`` for JSON) so extractive fallbacks elsewhere keep the pipeline running.
"""
from __future__ import annotations

import base64
import json
import logging
import re
from typing import Any, List, Optional

from ..config import cfg

log = logging.getLogger("evo.llm")


class LLMClient:
    def __init__(self) -> None:
        # provider name -> SDK client (or None when unavailable). Built lazily.
        self._clients: dict[str, Any] = {}

    # ------------------------------------------------------------- providers
    def _provider_client(self, provider: str):
        if provider in self._clients:
            return self._clients[provider]
        client = self._build_provider(provider)
        self._clients[provider] = client
        return client

    def _build_provider(self, provider: str):
        pc = cfg.models.providers.get(provider)
        if not pc or not pc.api_key:
            return None
        try:
            if provider in ("openrouter", "deepseek") or (pc.base_url and provider != "gemini"):
                from openai import OpenAI  # type: ignore

                return OpenAI(api_key=pc.api_key, base_url=pc.base_url or None)
            if provider == "gemini":
                from google import genai  # type: ignore

                return genai.Client(api_key=pc.api_key)
            if provider == "anthropic":
                import anthropic  # type: ignore

                return anthropic.Anthropic(api_key=pc.api_key)
        except Exception:  # noqa: BLE001 — missing SDK / bad config → degrade
            log.warning("provider %s unavailable (SDK or key missing)", provider, exc_info=True)
            return None
        return None

    def _role_available(self, role: str) -> bool:
        provider = cfg.models.provider_name(role)
        return self._provider_client(provider) is not None

    @property
    def available(self) -> bool:
        """Whether the default chat/answer (retrieval) role is configured."""
        return self._role_available("retrieval")

    def available_role(self, role: str) -> bool:
        return self._role_available(role)

    # ------------------------------------------------------------- text gen
    def complete(
        self,
        prompt: str,
        system: str = "",
        role: str = "retrieval",
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> str:
        provider = cfg.models.provider_name(role)
        client = self._provider_client(provider)
        if client is None:
            return ""  # caller provides an extractive fallback
        mdl = model or cfg.models.model_for(role)
        temperature = cfg.models.temperature_for(role)
        max_toks = max_tokens or cfg.models.max_tokens_for(role)
        sys_prompt = system or "You are a helpful study assistant."
        try:
            if provider == "gemini":
                return self._gemini_complete(client, mdl, sys_prompt, prompt, temperature, max_toks)
            if provider == "anthropic":
                return self._anthropic_complete(client, mdl, sys_prompt, prompt, max_toks)
            return self._openai_complete(client, mdl, sys_prompt, prompt, temperature, max_toks)
        except Exception:  # noqa: BLE001 — never let an LLM error crash the caller
            log.exception("LLM complete failed (role=%s provider=%s)", role, provider)
            return ""

    def complete_json(
        self,
        prompt: str,
        system: str = "",
        role: str = "extraction",
        max_tokens: Optional[int] = None,
    ) -> Any:
        """Complete and parse the first JSON value out of the reply.

        Returns ``None`` when nothing parseable comes back (or the role is
        unavailable), so callers can decide whether to raise or fall back."""
        raw = self.complete(prompt, system=system, role=role, max_tokens=max_tokens)
        return _extract_json(raw)

    # ------------------------------------------------------------- captions
    def caption_image(
        self,
        image_bytes: bytes,
        media_type: str = "image/png",
        role: str = "image_caption",
    ) -> str:
        provider = cfg.models.provider_name(role)
        client = self._provider_client(provider)
        if client is None:
            return ""
        mdl = cfg.models.model_for(role)
        instruction = "Describe this figure for a study index in one concise sentence."
        try:
            if provider == "gemini":
                from google.genai import types  # type: ignore

                resp = client.models.generate_content(
                    model=mdl,
                    contents=[
                        types.Part.from_bytes(data=image_bytes, mime_type=media_type),
                        instruction,
                    ],
                )
                return (getattr(resp, "text", "") or "").strip()
            if provider == "anthropic":
                b64 = base64.standard_b64encode(image_bytes).decode()
                msg = client.messages.create(
                    model=mdl,
                    max_tokens=160,
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                            {"type": "text", "text": instruction},
                        ],
                    }],
                )
                return "".join(b.text for b in msg.content if getattr(b, "type", "") == "text").strip()
            # OpenAI-compatible vision (data URL image_url part).
            b64 = base64.standard_b64encode(image_bytes).decode()
            resp = client.chat.completions.create(
                model=mdl,
                max_tokens=160,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": instruction},
                        {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{b64}"}},
                    ],
                }],
            )
            return (resp.choices[0].message.content or "").strip()
        except Exception:  # noqa: BLE001
            log.exception("caption_image failed (role=%s provider=%s)", role, provider)
            return ""

    # ------------------------------------------------------------- backends
    @staticmethod
    def _openai_complete(client, model: str, system: str, prompt: str, temperature: float, max_tokens: int) -> str:
        resp = client.chat.completions.create(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        return resp.choices[0].message.content or ""

    @staticmethod
    def _gemini_complete(client, model: str, system: str, prompt: str, temperature: float, max_tokens: int) -> str:
        from google.genai import types  # type: ignore

        resp = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )
        return getattr(resp, "text", "") or ""

    @staticmethod
    def _anthropic_complete(client, model: str, system: str, prompt: str, max_tokens: int) -> str:
        msg = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")


def _extract_json(text: str) -> Any:
    """Pull the first JSON object or array out of an LLM reply, tolerating prose
    and ```json fences around it."""
    if not text:
        return None
    fenced = re.search(r"```(?:json)?\s*(.+?)\s*```", text, re.DOTALL)
    candidate = fenced.group(1) if fenced else text
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass
    m = re.search(r"(\{.*\}|\[.*\])", candidate, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None
