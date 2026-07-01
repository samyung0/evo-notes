"""Retrieval HTTP service. The Go gateway proxies /chat and /generate here.

Queries run against the per-workspace LightRAG instances (query-side: pro by
default, flash reachable via the ``model`` field). One ``RagCache`` lives on the
FastAPI event loop so the asyncpg pools stay valid.

Run: ``uvicorn pipeline.retrieve.service:app --host 0.0.0.0 --port 8001``
"""
from __future__ import annotations

import json
import logging
import re
from contextlib import asynccontextmanager
from typing import Any, List, Optional

from fastapi import FastAPI
from pydantic import BaseModel

from ..config import cfg
from ..store import db
from ..rag.cache import RagCache
from ..rag.factory import build_query_rag
from ..rag.models import query_model_override

log = logging.getLogger("evo.retrieve")

_cache: Optional[RagCache] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _cache
    _cache = RagCache(build_query_rag, maxsize=cfg.lightrag_cache_size)
    log.info(
        "retrieval up — query_model=%s alt=%s embedding=%s",
        cfg.query_model,
        cfg.query_model_alt,
        cfg.embedding_model,
    )
    try:
        yield
    finally:
        await _cache.close()


app = FastAPI(title="Evo Notes retrieval", lifespan=lifespan)


class ChatReq(BaseModel):
    query: str
    workspaceId: str
    k: int = 6
    model: Optional[str] = None  # deepseek-v4-pro | deepseek-v4-flash


class GenerateReq(BaseModel):
    workspaceId: str
    kind: str = "quiz"  # summary | flashcards | quiz
    length: Optional[str] = None
    format: Optional[str] = None
    count: Optional[int] = None
    style: Optional[str] = None
    types: Optional[List[str]] = None
    levels: Optional[List[str]] = None  # cognitive levels: recall|application|analysis
    difficulty: Optional[List[str]] = None  # legacy alias, still accepted
    chapters: Optional[List[str]] = None
    timeLimitMin: Optional[int] = None


# Legacy easy/medium/hard -> cognitive level, so old callers keep working.
_LEVEL_ALIASES = {"easy": "recall", "medium": "application", "hard": "analysis"}
_VALID_LEVELS = {"recall", "application", "analysis"}

# What each cognitive level asks the LLM to write, so questions have a purpose
# instead of a vague difficulty knob.
_LEVEL_GUIDE = (
    "recall (remember a fact, term, or definition), "
    "application (use a concept or procedure to solve a problem), "
    "analysis (compare, break down, or reason about relationships between ideas)"
)


def _cognitive_levels(req: "GenerateReq") -> List[str]:
    if req.levels:
        return [lvl for lvl in req.levels if lvl in _VALID_LEVELS] or ["recall", "application"]
    if req.difficulty:
        return [_LEVEL_ALIASES.get(d, "application") for d in req.difficulty]
    return ["recall", "application"]


def _new_srs() -> dict:
    """Fresh FSRS 'new' state matching SrsState in src/api/types.ts."""
    from datetime import datetime, timezone

    return {
        "due": datetime.now(timezone.utc).isoformat(),
        "stability": 0,
        "difficulty": 0,
        "elapsed_days": 0,
        "scheduled_days": 0,
        "reps": 0,
        "lapses": 0,
        "state": 0,
        "learning_steps": 0,
    }


def _extract_json(text: str) -> Any:
    """Pull the first JSON value out of an LLM reply, tolerating prose/fences."""
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


async def _answer(workspace: str, query: str, model: Optional[str]) -> str:
    assert _cache is not None
    rag = await _cache.get(workspace)
    token = query_model_override.set(model if model in cfg.query_models else None)
    try:
        # vlm_enhanced disabled: answer from the text/graph index, no image re-encode.
        return await rag.aquery(query, mode="mix", vlm_enhanced=False)
    finally:
        query_model_override.reset(token)


@app.get("/healthz")
def healthz():
    return {"ok": True, "query_model": cfg.query_model, "embedding": cfg.embedding_model}


@app.post("/chat")
async def chat(req: ChatReq):
    text = await _answer(req.workspaceId, req.query, req.model)
    # Citations: LightRAG returns a synthesized answer (with an inline reference
    # section when configured) rather than structured spans; structured citations
    # are a follow-up. The Go gateway tolerates an empty list.
    return {"id": db.uid("m"), "role": "assistant", "text": text, "citations": []}


@app.post("/generate")
async def generate(req: GenerateReq):
    chapters = req.chapters or []
    if req.kind == "summary":
        body = await _answer(
            req.workspaceId,
            "Write a concise study summary of the most important ideas in this workspace. "
            "Use short bullet points.",
            cfg.query_model_alt,
        )
        return {"kind": "summary", "title": "Workspace summary", "body": body}

    if req.kind == "flashcards":
        n = req.count or 10
        raw = await _answer(
            req.workspaceId,
            f"Create {n} study flashcards from this workspace. Return ONLY a JSON array "
            'of objects {"front": "...", "back": "..."}.',
            cfg.query_model_alt,
        )
        data = _extract_json(raw) or []
        cards = [
            {
                "id": db.uid("c"),
                "deckId": "generated",
                "front": str(item.get("front", "")),
                "back": str(item.get("back", "")),
                "known": False,
                "srs": _new_srs(),
            }
            for item in data
            if isinstance(item, dict)
        ]
        return {"kind": "flashcards", "cards": cards}

    # quiz
    n = req.count or 5
    types = req.types or ["mcq"]
    levels = _cognitive_levels(req)
    raw = await _answer(
        req.workspaceId,
        f"Create a {n}-question quiz from this workspace using question types {types}. "
        'Tag each question with a cognitive "level" chosen from: '
        f"{_LEVEL_GUIDE}. Aim for a mix across these levels: {levels}, and make each "
        "question genuinely match the cognitive demand of its level. "
        "Return ONLY a JSON array of question objects. Each object has: "
        '"type" (one of mcq, multi, boolean, fill, short, ordering, matching), '
        '"level" (recall|application|analysis), "prompt", and the fields appropriate to its '
        "type (mcq/multi: options[] + correct[] indices; boolean: correct bool; "
        "fill/short: accepted[]; ordering: items[] in order; matching: pairs[] of {left,right}).",
        cfg.query_model,
    )
    data = _extract_json(raw) or []
    questions = []
    for item in data:
        if not isinstance(item, dict):
            continue
        item.setdefault("id", db.uid("q"))
        # Tolerate models that still emit legacy difficulty.
        if "level" not in item and "difficulty" in item:
            item["level"] = _LEVEL_ALIASES.get(item.pop("difficulty"), "application")
        item.setdefault("level", "application")
        questions.append(item)
    return {
        "kind": "quiz",
        "name": "Workspace quiz",
        "chapters": chapters,
        "questions": questions,
        "timeLimitMin": req.timeLimitMin,
    }
