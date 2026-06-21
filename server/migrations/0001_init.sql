-- Evo Notes — schema (Phase 1: app CRUD).
-- Mirrors the DTOs in src/api/types.ts so the Go gateway can serve the
-- existing frontend contract 1:1. RAG tables land in a later migration.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  email       text NOT NULL,
  avatar_url  text,
  class_label text,
  streak      int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workspaces (
  id               text PRIMARY KEY,
  name             text NOT NULL,
  color            text NOT NULL DEFAULT 'green',
  privacy          text NOT NULL DEFAULT 'private',
  tags             text[] NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chapters (
  id           text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         text NOT NULL,
  position     int  NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS chapters_ws_idx ON chapters(workspace_id);

CREATE TABLE IF NOT EXISTS files (
  id           text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  chapter_id   text REFERENCES chapters(id) ON DELETE SET NULL,
  name         text NOT NULL,
  kind         text NOT NULL DEFAULT 'pdf',
  size_kb      int  NOT NULL DEFAULT 0,
  added_at     timestamptz NOT NULL DEFAULT now(),
  status       text NOT NULL DEFAULT 'ready',   -- processing | ready | failed
  parser       text,
  engine       text,
  blob_path    text,
  url          text,
  content      text
);
CREATE INDEX IF NOT EXISTS files_ws_idx ON files(workspace_id);
CREATE INDEX IF NOT EXISTS files_chapter_idx ON files(chapter_id);

CREATE TABLE IF NOT EXISTS quizzes (
  id             text PRIMARY KEY,
  name           text NOT NULL,
  workspace_id   text REFERENCES workspaces(id) ON DELETE CASCADE,
  workspace_name text NOT NULL DEFAULT '',
  chapters       text[] NOT NULL DEFAULT '{}',
  questions      jsonb  NOT NULL DEFAULT '[]',
  created_at     timestamptz NOT NULL DEFAULT now(),
  privacy        text NOT NULL DEFAULT 'private',
  time_limit_min int
);

CREATE TABLE IF NOT EXISTS attempts (
  id             text PRIMARY KEY,
  quiz_id        text,
  quiz_name      text NOT NULL DEFAULT '',
  workspace_name text NOT NULL DEFAULT '',
  chapters       text[] NOT NULL DEFAULT '{}',
  correct        int NOT NULL DEFAULT 0,
  total          int NOT NULL DEFAULT 0,
  pct            int NOT NULL DEFAULT 0,
  taken_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decks (
  id             text PRIMARY KEY,
  name           text NOT NULL,
  workspace_id   text,
  workspace_name text NOT NULL DEFAULT '',
  color          text NOT NULL DEFAULT 'green',
  card_count     int NOT NULL DEFAULT 0,
  known_pct      int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cards (
  id      text PRIMARY KEY,
  deck_id text NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front   text NOT NULL,
  back    text NOT NULL,
  known   boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS cards_deck_idx ON cards(deck_id);

CREATE TABLE IF NOT EXISTS labels (
  id    text PRIMARY KEY,
  name  text NOT NULL,
  color text NOT NULL DEFAULT 'green'
);

CREATE TABLE IF NOT EXISTS events (
  id        text PRIMARY KEY,
  title     text NOT NULL,
  start_at  timestamptz NOT NULL,
  end_at    timestamptz NOT NULL,
  label_ids text[] NOT NULL DEFAULT '{}',
  location  text,
  note      text
);

CREATE TABLE IF NOT EXISTS tasks (
  id       text PRIMARY KEY,
  title    text NOT NULL,
  meta     text,
  done     boolean NOT NULL DEFAULT false,
  due_date timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS canvases (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  scene      jsonb
);

CREATE TABLE IF NOT EXISTS notifications (
  id    text PRIMARY KEY,
  kind  text NOT NULL,
  title text NOT NULL,
  body  text NOT NULL,
  at    timestamptz NOT NULL DEFAULT now(),
  read  boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public_workspaces (
  id               text PRIMARY KEY,
  name             text NOT NULL,
  color            text NOT NULL,
  privacy          text NOT NULL DEFAULT 'public',
  tags             text[] NOT NULL DEFAULT '{}',
  chapter_count    int NOT NULL DEFAULT 0,
  file_count       int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz NOT NULL DEFAULT now(),
  author           text NOT NULL,
  clones           int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public_quizzes (
  id             text PRIMARY KEY,
  name           text NOT NULL,
  workspace_id   text,
  workspace_name text NOT NULL DEFAULT '',
  chapters       text[] NOT NULL DEFAULT '{}',
  questions      jsonb NOT NULL DEFAULT '[]',
  created_at     timestamptz NOT NULL DEFAULT now(),
  privacy        text NOT NULL DEFAULT 'public',
  time_limit_min int,
  author         text NOT NULL,
  clones         int NOT NULL DEFAULT 0
);

-- Postgres-backed job queue for async ingestion (claimed via SKIP LOCKED).
CREATE TABLE IF NOT EXISTS jobs (
  id         text PRIMARY KEY,
  type       text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}',
  status     text NOT NULL DEFAULT 'pending',  -- pending | running | done | failed
  attempts   int NOT NULL DEFAULT 0,
  error      text,
  locked_at  timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status, created_at);
