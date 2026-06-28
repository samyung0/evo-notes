"""Render benchmark results as aligned text tables (and JSON). Dependency-free."""
from __future__ import annotations

import json
from typing import Any, Dict, List, Sequence

from .harness import EngineResult, ParserResult


def format_table(headers: Sequence[str], rows: Sequence[Sequence[Any]]) -> str:
    cols = [str(h) for h in headers]
    data = [[("" if c is None else str(c)) for c in row] for row in rows]
    widths = [len(h) for h in cols]
    for row in data:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))
    sep = "  "

    def line(cells: Sequence[str]) -> str:
        return sep.join(c.ljust(widths[i]) for i, c in enumerate(cells))

    out = [line(cols), sep.join("-" * w for w in widths)]
    out.extend(line(r) for r in data)
    return "\n".join(out)


def retrieval_table(dataset_name: str, results: List[EngineResult], ks: Sequence[int]) -> str:
    headers = ["engine", "MRR"]
    for k in ks:
        headers.append(f"R@{k}")
    for k in ks:
        headers.append(f"nDCG@{k}")
    headers += ["build(s)", "q(ms)"]
    rows: List[List[Any]] = []
    for r in results:
        row: List[Any] = [r.engine, f"{r.mrr:.3f}"]
        row += [f"{r.recall.get(k, 0.0):.3f}" for k in ks]
        row += [f"{r.ndcg.get(k, 0.0):.3f}" for k in ks]
        row += [f"{r.index_build_s:.3f}", f"{r.avg_query_ms:.2f}"]
        rows.append(row)
    title = f"Retrieval benchmark - dataset={dataset_name} queries={results[0].n_queries if results else 0}"
    return f"{title}\n{format_table(headers, rows)}"


def parser_table(results: List[ParserResult]) -> str:
    has_cov = any(r.coverage is not None for r in results)
    headers = ["parser", "ran_as", "files", "passages", "chars", "images", "pages", "lat(s)"]
    if has_cov:
        headers.append("coverage")
    rows: List[List[Any]] = []
    for r in results:
        row: List[Any] = [r.parser, r.ran_as, r.files, r.passages, r.chars, r.images, r.pages, f"{r.avg_latency_s:.3f}"]
        if has_cov:
            row.append("-" if r.coverage is None else f"{r.coverage:.3f}")
        rows.append(row)
    return "Parser benchmark\n" + format_table(headers, rows)


def retrieval_json(dataset_name: str, results: List[EngineResult]) -> str:
    payload: Dict[str, Any] = {"dataset": dataset_name, "engines": [r.as_dict() for r in results]}
    return json.dumps(payload, indent=2)


def parser_json(results: List[ParserResult]) -> str:
    return json.dumps({"parsers": [r.as_dict() for r in results]}, indent=2)
