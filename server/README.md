# Evo Notes — Gateway (Go)

Thin HTTP gateway implementing the frontend's `/api` contract (see
`src/mocks/handlers.ts`) against Postgres. Heavy ML (parsing, RAG) lives in the
Python `pipeline/` service and is reached via an async job queue + HTTP.

## Run

With Docker (recommended — brings up Postgres + pgvector too):

```bash
docker compose -f ../deploy/docker-compose.yml up --build
# gateway on http://localhost:8080, e.g. GET /api/me
```

Standalone (needs a Postgres reachable at `DATABASE_URL`):

```bash
cp .env.example .env          # adjust DATABASE_URL if needed
go mod tidy                   # resolve deps + write go.sum (first run)
go run ./cmd/api
```

Backblaze B2 is required. Set every `B2_*` variable in `.env`; startup verifies
bucket access and exits if those credentials are invalid.

The server applies the embedded `migrations/0001_init.sql` development baseline
(schema + seed) on startup; it is idempotent.

## Layout

- `cmd/api` — entrypoint (config, migrate, serve, graceful shutdown).
- `internal/store` — pgx pool, models (mirror `src/api/types.ts`), queries.
- `internal/httpapi` — chi router + handlers (mirror `src/mocks/handlers.ts`).
- `migrations` — `0001_init.sql` (complete schema, extensions, and development seed).

## Connect the frontend

From the repo root:

```bash
# point the SPA at the real gateway instead of MSW
VITE_USE_MSW=false pnpm dev
```

Vite proxies `/api` → `http://localhost:8080` (see `vite.config.ts`).

## Notes / next

- `POST /workspaces/:id/chat` and `/generate` are Phase-1 placeholders returning
  the same shapes as the mock; Phase 3 wires them to the Python retrieval service.
- File uploads currently land `status='ready'`; Phase 2 switches to multipart +
  `status='processing'` + an `ingest` job on the Postgres-backed `jobs` queue.
