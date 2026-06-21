-- RAG corpus (shared by both engines) + engine-specific structures.
-- Embedding dimension is fixed at 384 (dev / all-MiniLM default). Changing the
-- embedding model means changing the vector(384) dims here and re-indexing.

CREATE TABLE IF NOT EXISTS documents (
  id           text PRIMARY KEY,
  file_id      text NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  workspace_id text NOT NULL,
  parser       text NOT NULL,
  status       text NOT NULL DEFAULT 'pending',
  pages        int,
  meta         jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_file_idx ON documents(file_id);

CREATE TABLE IF NOT EXISTS passages (
  id           text PRIMARY KEY,
  document_id  text NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workspace_id text NOT NULL,
  ord          int NOT NULL DEFAULT 0,
  text         text NOT NULL,
  themes       text[] NOT NULL DEFAULT '{}',
  embedding    vector(384)
);
CREATE INDEX IF NOT EXISTS passages_ws_idx ON passages(workspace_id);
CREATE INDEX IF NOT EXISTS passages_doc_idx ON passages(document_id);
CREATE INDEX IF NOT EXISTS passages_embed_idx ON passages USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS sentences (
  id           text PRIMARY KEY,
  passage_id   text NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  workspace_id text NOT NULL,
  ord          int NOT NULL DEFAULT 0,
  text         text NOT NULL,
  embedding    vector(384)
);
CREATE INDEX IF NOT EXISTS sentences_passage_idx ON sentences(passage_id);
CREATE INDEX IF NOT EXISTS sentences_ws_idx ON sentences(workspace_id);
CREATE INDEX IF NOT EXISTS sentences_embed_idx ON sentences USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS concepts (
  id             text PRIMARY KEY,
  workspace_id   text NOT NULL,
  canonical_name text NOT NULL,
  ctype          text NOT NULL DEFAULT 'concept',  -- person|org|location|product|concept|method|...
  aliases        text[] NOT NULL DEFAULT '{}',
  embedding      vector(384),
  UNIQUE (workspace_id, canonical_name)
);
CREATE INDEX IF NOT EXISTS concepts_ws_idx ON concepts(workspace_id);

-- Bipartite edges. LinearRAG reads passage_concept as a sparse matrix for PPR;
-- sentence_concept drives sentence-level semantic bridging during activation.
CREATE TABLE IF NOT EXISTS passage_concept (
  passage_id text NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  concept_id text NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  weight     real NOT NULL DEFAULT 1,
  engine     text NOT NULL DEFAULT 'shared',
  PRIMARY KEY (passage_id, concept_id, engine)
);
CREATE INDEX IF NOT EXISTS passage_concept_concept_idx ON passage_concept(concept_id);

CREATE TABLE IF NOT EXISTS sentence_concept (
  sentence_id text NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  concept_id  text NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  weight      real NOT NULL DEFAULT 1,
  PRIMARY KEY (sentence_id, concept_id)
);

-- LightRAG-specific (populated in Phase 3): entity relations + keyword/theme nodes.
CREATE TABLE IF NOT EXISTS relations (
  id             bigserial PRIMARY KEY,
  workspace_id   text NOT NULL,
  src_concept_id text NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  dst_concept_id text NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  description    text,
  weight         real NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS keywords (
  id           text PRIMARY KEY,
  workspace_id text NOT NULL,
  term         text NOT NULL,
  level        text NOT NULL DEFAULT 'low',  -- low | high (theme)
  embedding    vector(384)
);
CREATE TABLE IF NOT EXISTS passage_keyword (
  passage_id text NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  keyword_id text NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  PRIMARY KEY (passage_id, keyword_id)
);
