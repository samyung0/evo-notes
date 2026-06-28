"""Benchmark harness — run parsers and RAG engines in isolation over a fixed
input, and emit comparable metrics.

Two benchmarks:

- **Parser benchmark** (`run_parser_benchmark`): coverage / structure / latency
  for each parser over the same files. Optional ground-truth text gives a
  token-recall "coverage" score.
- **Retrieval benchmark** (`run_retrieval_benchmark`): recall@k, nDCG@k, MRR plus
  index-build time and query latency for each engine over one fixed corpus.

The retrieval benchmark defaults to the in-memory backend so it runs with zero
infrastructure; pass ``backend="pg"`` with a live connection to get
production-fidelity numbers (same engine code, pgvector instead of Python
cosine). Running every engine over a single indexed corpus isolates the *engine*
effect; running one engine over corpora from different parsers isolates the
*parser* effect.
"""
from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from ..engines import get_engine
from ..ingest import indexer, lightrag_index
from ..llm.client import LLMClient
from ..llm.embeddings import get_embedder
from ..parsers import ParseOpts, get_parser
from ..store.memory import MemoryCorpus
from . import metrics

log = logging.getLogger("evo.bench")

DATASETS_DIR = Path(__file__).parent / "datasets"


# --------------------------------------------------------------------- datasets

@dataclass
class Dataset:
    name: str
    documents: List[Dict[str, str]]            # [{id, text}]
    queries: List[Dict[str, Any]]              # [{id, query, relevant: [doc_id]}]

    @property
    def n_docs(self) -> int:
        return len(self.documents)


def load_dataset(path: str) -> Dataset:
    """Load a labelled retrieval dataset. ``path`` may be a file path or the bare
    name of a bundled dataset under ``bench/datasets`` (with or without .json)."""
    p = Path(path)
    if not p.exists():
        cand = DATASETS_DIR / (path if path.endswith(".json") else f"{path}.json")
        if cand.exists():
            p = cand
        else:
            raise FileNotFoundError(f"dataset not found: {path} (looked in {DATASETS_DIR})")
    data = json.loads(p.read_text(encoding="utf-8"))
    return Dataset(
        name=data.get("name", p.stem),
        documents=data["documents"],
        queries=data["queries"],
    )


def list_datasets() -> List[str]:
    return sorted(f.stem for f in DATASETS_DIR.glob("*.json"))


# --------------------------------------------------------------------- corpus build

def build_memory_corpus(dataset: Dataset, embedder, ws: str = "bench", llm: Optional[LLMClient] = None) -> tuple[MemoryCorpus, float]:
    """Index every dataset document (one document == one file) into a fresh
    in-memory corpus. When ``llm`` is given, also build the LightRAG LLM graph.
    Returns (corpus, build_seconds)."""
    corpus = MemoryCorpus()
    t0 = time.perf_counter()
    for doc in dataset.documents:
        corpus.add_file(doc["id"], doc["id"])
        doc_id = indexer.index_document(corpus, embedder, ws, doc["id"], "dataset", [doc["text"]], pages=1)
        if llm is not None:
            lightrag_index.build(corpus, embedder, llm, ws, doc["id"], doc_id)
    return corpus, time.perf_counter() - t0


def build_pg_corpus(conn, dataset: Dataset, embedder, ws: str, llm: Optional[LLMClient] = None) -> float:
    """Index a dataset into Postgres under a throwaway workspace. Caller is
    responsible for purging ``ws`` afterwards. When ``llm`` is given, also build
    the LightRAG LLM graph. Returns build_seconds."""
    from ..store import db
    from ..store.pg import PgCorpus

    with conn.cursor() as cur:
        db.purge_workspace(cur, ws)
        db.create_workspace_min(cur, ws, "Benchmark")
        for doc in dataset.documents:
            db.create_file_min(cur, doc["id"], ws, doc["id"])
    conn.commit()

    corpus = PgCorpus(conn)
    t0 = time.perf_counter()
    try:
        for doc in dataset.documents:
            doc_id = indexer.index_document(corpus, embedder, ws, doc["id"], "dataset", [doc["text"]], pages=1)
            if llm is not None:
                lightrag_index.build(corpus, embedder, llm, ws, doc["id"], doc_id)
        conn.commit()
    finally:
        corpus.close()
    return time.perf_counter() - t0


# --------------------------------------------------------------------- retrieval bench

@dataclass
class EngineResult:
    engine: str
    recall: Dict[int, float] = field(default_factory=dict)
    ndcg: Dict[int, float] = field(default_factory=dict)
    mrr: float = 0.0
    index_build_s: float = 0.0
    avg_query_ms: float = 0.0
    n_queries: int = 0

    def as_dict(self) -> Dict[str, Any]:
        return {
            "engine": self.engine,
            "recall": {str(k): round(v, 4) for k, v in self.recall.items()},
            "ndcg": {str(k): round(v, 4) for k, v in self.ndcg.items()},
            "mrr": round(self.mrr, 4),
            "indexBuildSec": round(self.index_build_s, 4),
            "avgQueryMs": round(self.avg_query_ms, 3),
            "nQueries": self.n_queries,
        }


def _ranked_docs(passages: Sequence[Dict[str, Any]]) -> List[str]:
    """Collapse ranked passages to a ranked list of unique document (file) ids."""
    seen: set[str] = set()
    docs: List[str] = []
    for p in passages:
        fid = p["fileId"]
        if fid not in seen:
            seen.add(fid)
            docs.append(fid)
    return docs


def evaluate_engine(corpus, engine, embedder, dataset: Dataset, ks: Sequence[int], ws: str, index_build_s: float) -> EngineResult:
    res = EngineResult(engine=engine.name, index_build_s=index_build_s, n_queries=len(dataset.queries))
    maxk = max(ks)
    retrieve_k = max(maxk * 5, 10)
    rr: List[float] = []
    recalls: Dict[int, List[float]] = {k: [] for k in ks}
    ndcgs: Dict[int, List[float]] = {k: [] for k in ks}
    total_ms = 0.0
    for q in dataset.queries:
        relevant = set(q.get("relevant", []))
        t0 = time.perf_counter()
        passages = engine.retrieve(corpus, embedder, ws, q["query"], retrieve_k)
        total_ms += (time.perf_counter() - t0) * 1000.0
        ranked = _ranked_docs(passages)
        rr.append(metrics.reciprocal_rank(ranked, relevant))
        for k in ks:
            recalls[k].append(metrics.recall_at_k(ranked, relevant, k))
            ndcgs[k].append(metrics.ndcg_at_k(ranked, relevant, k))
    res.mrr = metrics.mean(rr)
    res.recall = {k: metrics.mean(v) for k, v in recalls.items()}
    res.ndcg = {k: metrics.mean(v) for k, v in ndcgs.items()}
    res.avg_query_ms = total_ms / len(dataset.queries) if dataset.queries else 0.0
    return res


def run_retrieval_benchmark(
    dataset: Dataset,
    engine_names: Sequence[str],
    embedder=None,
    ks: Sequence[int] = (1, 3, 5),
    backend: str = "memory",
    conn=None,
    ws: str = "bench",
) -> List[EngineResult]:
    """Benchmark each engine over one fixed corpus built from ``dataset``."""
    embedder = embedder or get_embedder()
    engine_names = list(engine_names)

    # LightRAG needs an LLM-extracted graph at index time. Gate it on a
    # configured extraction model; otherwise drop it (linearrag/dense still run
    # fully offline).
    llm: Optional[LLMClient] = None
    if "lightrag" in engine_names:
        candidate = LLMClient()
        if candidate.available_role("extraction"):
            llm = candidate
        else:
            log.warning("lightrag benchmark skipped: no extraction LLM configured")
            engine_names = [n for n in engine_names if n != "lightrag"]

    results: List[EngineResult] = []

    if backend == "memory":
        corpus, build_s = build_memory_corpus(dataset, embedder, ws, llm=llm)
        for name in engine_names:
            engine = get_engine(name)
            results.append(evaluate_engine(corpus, engine, embedder, dataset, ks, ws, build_s))
        return results

    if backend == "pg":
        if conn is None:
            from ..store import db
            conn = db.connect()
        from ..store import db
        from ..store.pg import PgCorpus
        try:
            build_s = build_pg_corpus(conn, dataset, embedder, ws, llm=llm)
            for name in engine_names:
                engine = get_engine(name)
                corpus = PgCorpus(conn)
                try:
                    results.append(evaluate_engine(corpus, engine, embedder, dataset, ks, ws, build_s))
                finally:
                    corpus.close()
        finally:
            with conn.cursor() as cur:
                db.purge_workspace(cur, ws)
            conn.commit()
        return results

    raise ValueError(f"unknown backend: {backend!r} (use 'memory' or 'pg')")


# --------------------------------------------------------------------- parser bench

@dataclass
class ParserResult:
    parser: str                       # requested parser
    ran_as: str                       # parser that actually ran (fallback-aware)
    files: int = 0
    passages: int = 0
    chars: int = 0
    images: int = 0
    pages: int = 0
    avg_latency_s: float = 0.0
    coverage: Optional[float] = None  # token recall vs ground truth, if provided

    def as_dict(self) -> Dict[str, Any]:
        d = {
            "parser": self.parser,
            "ranAs": self.ran_as,
            "files": self.files,
            "passages": self.passages,
            "chars": self.chars,
            "images": self.images,
            "pages": self.pages,
            "avgLatencySec": round(self.avg_latency_s, 4),
        }
        if self.coverage is not None:
            d["coverage"] = round(self.coverage, 4)
        return d


def _tokens(text: str) -> set[str]:
    import re
    return {t.lower() for t in re.findall(r"[A-Za-z0-9]+", text)}


def _truth_for(input_path: str, truth_dir: Optional[str]) -> Optional[str]:
    """Find a ground-truth .txt for an input file (same stem), if available."""
    stem = Path(input_path).stem
    candidates = []
    if truth_dir:
        candidates.append(Path(truth_dir) / f"{stem}.txt")
    candidates.append(Path(input_path).with_suffix(".truth.txt"))
    for c in candidates:
        if c.exists():
            return c.read_text(encoding="utf-8", errors="replace")
    return None


def run_parser_benchmark(
    inputs: Sequence[str],
    parser_names: Sequence[str],
    annotate: bool = False,
    truth_dir: Optional[str] = None,
    chunk_chars: int = 900,
) -> List[ParserResult]:
    """Run each parser over the same input files and aggregate metrics."""
    files = _expand_inputs(inputs)
    results: List[ParserResult] = []
    for pname in parser_names:
        parser = get_parser(pname)
        res = ParserResult(parser=pname, ran_as=parser.name)
        latencies: List[float] = []
        coverages: List[float] = []
        for path in files:
            t0 = time.perf_counter()
            doc = parser.parse(path, ParseOpts(annotate_images=annotate, chunk_chars=chunk_chars))
            latencies.append(time.perf_counter() - t0)
            res.files += 1
            res.passages += len(doc.passages)
            text = "\n".join(doc.passages)
            res.chars += len(text)
            res.images += len(doc.images)
            res.pages += doc.pages or 0
            truth = _truth_for(path, truth_dir)
            if truth:
                tt = _tokens(truth)
                if tt:
                    coverages.append(len(tt & _tokens(text)) / len(tt))
        res.avg_latency_s = sum(latencies) / len(latencies) if latencies else 0.0
        if coverages:
            res.coverage = sum(coverages) / len(coverages)
        results.append(res)
    return results


def _expand_inputs(inputs: Sequence[str]) -> List[str]:
    out: List[str] = []
    for item in inputs:
        if os.path.isdir(item):
            for root, _dirs, names in os.walk(item):
                for n in sorted(names):
                    if n.endswith(".truth.txt"):
                        continue
                    out.append(os.path.join(root, n))
        else:
            out.append(item)
    return out
