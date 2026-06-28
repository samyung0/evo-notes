"""Adapter functions mapping our role-based model spec onto RAG-Anything's three
slots: ``llm_model_func``, ``vision_model_func`` and ``embedding_func``.

Routing (per the project's existing spec):
- embedding      -> OpenRouter ``qwen/qwen3-embedding-4b`` (dim 2560, pinned)
- ingest LLM     -> DeepSeek ``deepseek-v4-flash`` (cheap graph extraction)
- query LLM      -> DeepSeek, defaults to ``deepseek-v4-pro``; ``deepseek-v4-flash``
                    stays reachable via a per-request contextvar dispatcher
- vision/caption -> Gemini ``gemini-3.1-flash-lite-preview`` (DeepSeek is text-only)

All providers are reached over the OpenAI-compatible API, so a single
``AsyncOpenAI`` client style works for every role.
"""
from __future__ import annotations

import contextvars
from typing import Any, Callable, List, Optional

import numpy as np
from openai import AsyncOpenAI

from lightrag.utils import EmbeddingFunc
from lightrag.llm.openai import openai_complete_if_cache

from ..config import ProviderCfg, cfg

# Per-request override for the query model (set by the retrieval service). The
# ingest worker never touches it, so ingest always uses its fixed model.
query_model_override: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "query_model_override", default=None
)

# OpenAI client kwargs that are safe to forward to chat.completions. Everything
# else LightRAG/RAG-Anything passes (hashing_kv, keyword_extraction, mode, ...)
# is internal bookkeeping and must be dropped.
_SAFE_CHAT_KWARGS = {
    "temperature",
    "max_tokens",
    "top_p",
    "stop",
    "presence_penalty",
    "frequency_penalty",
    "response_format",
    "seed",
}

_clients: dict[str, AsyncOpenAI] = {}


def _client(p: ProviderCfg) -> AsyncOpenAI:
    key = f"{p.base_url}|{p.api_key[:8]}"
    client = _clients.get(key)
    if client is None:
        client = AsyncOpenAI(api_key=p.api_key or "missing", base_url=p.base_url or None)
        _clients[key] = client
    return client


def _safe_chat_kwargs(kwargs: dict) -> dict:
    return {k: v for k, v in kwargs.items() if k in _SAFE_CHAT_KWARGS}


# --------------------------------------------------------------- embeddings

def make_embedding_func() -> EmbeddingFunc:
    """OpenRouter Qwen3-Embedding-4B with the dimension pinned (matryoshka).

    The dimension is part of the vector-store schema, so it must never drift:
    we always request ``dimensions`` and hard-fail if the provider returns a
    different size.
    """
    model = cfg.embedding_model
    dim = cfg.embedding_dim
    provider = cfg.embedding

    async def _embed(texts: List[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, dim), dtype=np.float32)
        client = _client(provider)
        resp = await client.embeddings.create(
            model=model, input=list(texts), dimensions=dim
        )
        vectors = [d.embedding for d in resp.data]
        out = np.array(vectors, dtype=np.float32)
        if out.shape[1] != dim:
            raise RuntimeError(
                f"embedding model {model} returned dim {out.shape[1]} != EMBEDDING_DIM {dim}; "
                "fix EMBEDDING_DIM (and re-ingest) — the vector store schema is fixed at first use."
            )
        return out

    return EmbeddingFunc(
        embedding_dim=dim, max_token_size=cfg.embedding_max_tokens, func=_embed
    )


# ------------------------------------------------------------------- text LLM

def make_llm_func(model: str) -> Callable:
    """A fixed-model DeepSeek text completion func (used for ingest)."""
    provider = cfg.llm

    async def llm_model_func(
        prompt: str,
        system_prompt: Optional[str] = None,
        history_messages: Optional[list] = None,
        **kwargs: Any,
    ) -> str:
        return await openai_complete_if_cache(
            model,
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages or [],
            base_url=provider.base_url,
            api_key=provider.api_key,
            **kwargs,
        )

    return llm_model_func


def make_query_llm_func() -> Callable:
    """Query-side DeepSeek func that honours a per-request model override.

    Defaults to ``EVO_QUERY_MODEL`` (pro); a request may switch to
    ``EVO_QUERY_MODEL_ALT`` (flash) via ``query_model_override``.
    """
    provider = cfg.llm
    allowed = cfg.query_models
    default = cfg.query_model

    async def llm_model_func(
        prompt: str,
        system_prompt: Optional[str] = None,
        history_messages: Optional[list] = None,
        **kwargs: Any,
    ) -> str:
        chosen = query_model_override.get() or default
        if chosen not in allowed:
            chosen = default
        return await openai_complete_if_cache(
            chosen,
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages or [],
            base_url=provider.base_url,
            api_key=provider.api_key,
            **kwargs,
        )

    return llm_model_func


# -------------------------------------------------------------------- vision

def _as_data_url(image_data: str) -> str:
    if image_data.startswith("data:"):
        return image_data
    return f"data:image/jpeg;base64,{image_data}"


def make_vision_func(text_fallback: Callable) -> Callable:
    """Gemini multimodal caption func, matching RAG-Anything's expected shape.

    RAG-Anything calls this with either ``image_data`` (base64, at ingest) or a
    full OpenAI-style ``messages`` list (VLM-enhanced query). With neither, it is
    a plain text call, which we route to the provided text fallback so a single
    slot can serve both.
    """
    provider = cfg.vision
    model = cfg.vision_model

    async def vision_model_func(
        prompt: str = "",
        system_prompt: Optional[str] = None,
        history_messages: Optional[list] = None,
        image_data: Optional[str] = None,
        messages: Optional[list] = None,
        **kwargs: Any,
    ) -> str:
        if messages:
            chat = messages
        elif image_data:
            content = [{"type": "text", "text": prompt or "Describe this image."}]
            content.append(
                {"type": "image_url", "image_url": {"url": _as_data_url(image_data)}}
            )
            chat = []
            if system_prompt:
                chat.append({"role": "system", "content": system_prompt})
            chat.append({"role": "user", "content": content})
        else:
            return await text_fallback(
                prompt,
                system_prompt=system_prompt,
                history_messages=history_messages or [],
                **kwargs,
            )

        client = _client(provider)
        resp = await client.chat.completions.create(
            model=model, messages=chat, **_safe_chat_kwargs(kwargs)
        )
        return resp.choices[0].message.content or ""

    return vision_model_func
