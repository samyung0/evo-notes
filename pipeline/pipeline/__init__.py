"""Evo Notes parser + RAG pipeline.

Pluggable parsers (MinerU / Docling) and RAG engines (LightRAG / LinearRAG)
behind small interfaces, selected by config. A CLI benchmarks each in
isolation; deployment pins one parser + one engine.
"""

__version__ = "0.1.0"
