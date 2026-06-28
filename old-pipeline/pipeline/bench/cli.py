"""Benchmark CLI — run a parser or engine in isolation and print a metrics table.

  evo-bench parse <file|dir> [--parser simple|docling|mineru|all] [--truth DIR] [--json]
  evo-bench retrieve [--dataset sample] [--engine dense|linearrag|lightrag|all]
                     [--backend memory|pg] [--k 1 --k 3 --k 5] [--json]
  evo-bench datasets

`retrieve` defaults to the in-memory backend, so it runs with no database. Use
`--backend pg` (with DATABASE_URL set) to benchmark against Postgres/pgvector.
"""
from __future__ import annotations

import argparse

from . import harness, report

ALL_PARSERS = ["simple", "docling", "mineru"]
ALL_ENGINES = ["dense", "linearrag", "lightrag"]


def cmd_parse(args: argparse.Namespace) -> None:
    parsers = ALL_PARSERS if "all" in args.parser else args.parser
    results = harness.run_parser_benchmark(
        args.input,
        parsers,
        annotate=args.annotate,
        truth_dir=args.truth or None,
    )
    print(report.parser_json(results) if args.json else report.parser_table(results))


def cmd_retrieve(args: argparse.Namespace) -> None:
    engines = ALL_ENGINES if "all" in args.engine else args.engine
    ks = sorted(set(args.k)) if args.k else [1, 3, 5]
    dataset = harness.load_dataset(args.dataset)
    results = harness.run_retrieval_benchmark(dataset, engines, ks=ks, backend=args.backend)
    if args.json:
        print(report.retrieval_json(dataset.name, results))
    else:
        print(report.retrieval_table(dataset.name, results, ks))


def cmd_datasets(_args: argparse.Namespace) -> None:
    for name in harness.list_datasets():
        print(name)


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="evo-bench")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("parse", help="benchmark parsers over files")
    p.add_argument("input", nargs="+", help="file(s) or directory(ies) to parse")
    p.add_argument("--parser", action="append", default=[], choices=ALL_PARSERS + ["all"],
                   help="repeatable; default 'simple'")
    p.add_argument("--truth", default="", help="dir of <stem>.txt ground-truth for coverage")
    p.add_argument("--annotate", action="store_true", help="run VLM image annotation (needs ANTHROPIC_API_KEY)")
    p.add_argument("--json", action="store_true")
    p.set_defaults(fn=cmd_parse)

    r = sub.add_parser("retrieve", help="benchmark engines on a labelled dataset")
    r.add_argument("--dataset", default="sample", help="bundled name or path to a qrels json")
    r.add_argument("--engine", action="append", default=[], choices=ALL_ENGINES + ["all"],
                   help="repeatable; default 'all'")
    r.add_argument("--backend", default="memory", choices=["memory", "pg"])
    r.add_argument("--k", action="append", type=int, default=[], help="repeatable cutoff; default 1 3 5")
    r.add_argument("--json", action="store_true")
    r.set_defaults(fn=cmd_retrieve)

    d = sub.add_parser("datasets", help="list bundled retrieval datasets")
    d.set_defaults(fn=cmd_datasets)
    return ap


def main() -> None:
    ap = build_parser()
    args = ap.parse_args()
    if getattr(args, "cmd", None) == "parse" and not args.parser:
        args.parser = ["simple"]
    if getattr(args, "cmd", None) == "retrieve" and not args.engine:
        args.engine = ["all"]
    args.fn(args)


if __name__ == "__main__":
    main()
