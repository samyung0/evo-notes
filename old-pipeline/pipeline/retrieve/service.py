"""Retrieval HTTP service. The Go gateway proxies /chat and /generate here
(Phase 3); for now it's runnable/testable standalone.

Run: uvicorn pipeline.retrieve.service:app --port 8001
"""
from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from typing import List, Optional

from ..config import cfg
from ..engines import get_engine
from ..generate import generate as generate_artifact
from ..llm.client import LLMClient
from ..llm.embeddings import get_embedder
from ..store import db
from ..store.pg import PgCorpus

app = FastAPI(title="Evo Notes retrieval")

_embedder = get_embedder()
_engine = get_engine(cfg.engine)
_llm = LLMClient()


class RetrieveReq(BaseModel):
    query: str
    workspaceId: str
    k: int = 8


class ChatReq(BaseModel):
    query: str
    workspaceId: str
    k: int = 6


class GenerateReq(BaseModel):
    workspaceId: str
    kind: str = "quiz"  # summary | flashcards | quiz
    length: Optional[str] = None
    format: Optional[str] = None
    count: Optional[int] = None
    style: Optional[str] = None
    types: Optional[List[str]] = None
    difficulty: Optional[List[str]] = None
    chapters: Optional[List[str]] = None
    timeLimitMin: Optional[int] = None


@app.get("/healthz")
def healthz():
    return {"ok": True, "engine": _engine.name, "embedder": cfg.embedder, "llm": _llm.available}


@app.post("/retrieve")
def retrieve(req: RetrieveReq):
    with db.connect() as conn:
        with PgCorpus(conn) as corpus:
            return {"passages": _engine.retrieve(corpus, _embedder, req.workspaceId, req.query, req.k)}


@app.post("/chat")
def chat(req: ChatReq):
    with db.connect() as conn:
        with PgCorpus(conn) as corpus:
            passages = _engine.retrieve(corpus, _embedder, req.workspaceId, req.query, req.k)

    context = "\n\n".join(f"[{i + 1}] {p['text']}" for i, p in enumerate(passages))
    citations = [
        {"fileId": p["fileId"], "fileName": p["fileName"], "snippet": p["text"][:200]}
        for p in passages
    ]

    if _llm.available and context:
        text = _llm.complete(
            system="Answer the question using ONLY the provided sources. Cite sources as [n]. If the sources don't cover it, say so.",
            prompt=f"Sources:\n{context}\n\nQuestion: {req.query}",
        )
    elif passages:
        text = "Top matching passage:\n\n" + passages[0]["text"][:600]
    else:
        text = "No indexed sources yet for this workspace — add a source to start."

    return {"id": db.uid("m"), "role": "assistant", "text": text, "citations": citations}


@app.post("/generate")
def generate(req: GenerateReq):
    with db.connect() as conn:
        with conn.cursor() as cur:
            passages = db.workspace_passages(cur, req.workspaceId, limit=24)
    opts = req.model_dump(exclude={"workspaceId", "kind"})
    return generate_artifact(req.kind, passages, opts, _llm)
