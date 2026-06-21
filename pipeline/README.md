# Evo Notes — Pipeline (Python)

Parser + RAG pipeline. Pluggable **parsers** (MinerU / Docling) and **engines**
(LightRAG / LinearRAG) behind small interfaces, selected by env. One service,
three roles: ingest worker, retrieval API, and a benchmark CLI.

## Roles

- **Worker** — `python -m pipeline.ingest.worker`: claims `ingest` jobs from the
  Postgres queue, parses the uploaded blob, normalizes to passages/sentences,
  extracts + links concepts, embeds everything, marks the file `ready`.
- **Retrieval** — `uvicorn pipeline.retrieve.service:app --port 8001`:
  `POST /retrieve` and `POST /chat` over the indexed corpus.
- **Bench** — `evo-bench parse|retrieve|datasets`: benchmark a parser or engine
  in isolation (see **Benchmarks** below).

## Config (env)

| var | default | meaning |
|---|---|---|
| `DATABASE_URL` | `postgres://evo:evo@localhost:5432/evo` | shared Postgres |
| `BLOB_DIR` | `./data/blobs` | shared upload volume (gateway writes, worker reads) |
| `EVO_PARSER` | `simple` | `simple` \| `docling` \| `mineru` |
| `EVO_ENGINE` | `linearrag` | `dense` \| `linearrag` \| `lightrag` |
| `EVO_EMBEDDER` | `hash` | `hash` (offline dev) \| `st` (sentence-transformers) |
| `ANTHROPIC_API_KEY` | – | enables Claude chat + VLM image captions |

`simple` + `hash` need **no ML deps**, so the whole flow runs offline. Pin a
real pair with extras:

```bash
pip install '.[docling,embed,llm,pdf]'   # or [mineru,...]
EVO_PARSER=docling EVO_EMBEDDER=st EVO_ENGINE=linearrag python -m pipeline.ingest.worker
```

> The embedding dim is fixed at 384 (`config.EMBED_DIM`, `vector(384)` in
> `server/migrations/0003_rag.sql`). A different model means changing both + reindexing.

## Architecture

- `parsers/` — `Parser` protocol + `ParsedDoc`; `simple` (md/txt/pdf fallback),
  `docling`, `mineru` (import-guarded), `annotate` (VLM captions). `get_parser`
  falls back to `simple` when a heavy backend isn't installed.
- `engines/` — `RagEngine` protocol + `dense` baseline, `linearrag` (concept
  activation + sentence bridging + bipartite **PPR** + dense blend + theme gate),
  `lightrag` (dense + high-level theme keywords + low-level concept match with a
  one-hop relation expansion). Engines are **corpus-agnostic**: they take a
  `Corpus`, not a DB handle.
- `store/` — the `Corpus` protocol (`corpus.py`) with two backends: `pg.PgCorpus`
  (production; delegates to the SQL in `db.py`, vectors as `::vector` literals)
  and `memory.MemoryCorpus` (dependency-free, in-process cosine). The same
  engine + indexer code runs on either, which is what makes the benchmark fair
  and lets the unit tests run with no database.
- `ingest/` — `normalize` (sentences), `concepts` (heuristic; `nlp` extra for
  spaCy/KeyBERT), `indexer` (parsed doc → corpus graph, backend-agnostic),
  `worker` (queue loop).
- `bench/` — `harness` (parser + retrieval benchmarks), `metrics` (recall@k /
  nDCG@k / MRR), `report` (tables/JSON), `cli` (`evo-bench`), `datasets/`.
- `llm/` — `LLMClient` (Anthropic Claude) + `Embedder` (hash/ST).

## Run (with the rest of the stack)

```bash
docker compose -f ../deploy/docker-compose.yml up --build
# upload a file in the app (VITE_USE_MSW=false), then:
curl -s localhost:8001/healthz
curl -s localhost:8001/retrieve -H 'content-type: application/json' \
  -d '{"query":"mitochondria","workspaceId":"ws_bio","k":5}'
```

## Benchmarks

Two benchmarks, isolation by design: run **every engine over one fixed corpus**
to measure the engine effect; run **one engine over corpora from different
parsers** to measure the parser effect.

```bash
evo-bench datasets                        # list bundled qrels datasets
evo-bench retrieve                        # all engines, sample dataset, in-memory
evo-bench retrieve --dataset multihop --engine linearrag --engine lightrag
evo-bench retrieve --backend pg           # against Postgres/pgvector (DATABASE_URL)
evo-bench retrieve --json                 # machine-readable

evo-bench parse ./docs --parser all       # coverage/structure/latency per parser
evo-bench parse paper.pdf --parser docling --truth ./truth   # token coverage
```

- **Retrieval** reports `MRR`, `recall@k`, `nDCG@k` (`--k` repeatable), index
  build time, and avg query latency per engine. The in-memory backend needs no
  database and is deterministic (hash embedder); `--backend pg` runs the
  identical engine code against pgvector for production-fidelity numbers.
- **Parser** reports passages/chars/images/pages/latency, the `ran_as` column
  (so a missing Docling/MinerU backend that fell back to `simple` is visible),
  and a token-recall `coverage` score when ground-truth `<stem>.txt` files are
  supplied.

A retrieval dataset is just `{name, documents:[{id,text}], queries:[{id,query,
relevant:[doc_id]}]}` — drop a JSON file in `pipeline/bench/datasets/` (or pass a
path) to add your own.

## Tests

No database required — the in-memory corpus exercises the real engine algorithms.
Managed with [uv](https://docs.astral.sh/uv/):

```bash
cd pipeline
uv venv && uv pip install -e ".[test]"
uv run pytest                       # 95 tests
# the stdlib runner works too (no pytest needed, just the installed package):
uv run python -m unittest discover -s tests -t .
```

Covered: metrics, PPR, concept/sentence extraction, hash embeddings, parser
registry + chunking, in-memory corpus, indexer graph build, all three engines
end-to-end, the benchmark harness/report, artifact generation, and the retrieval
service endpoints.
