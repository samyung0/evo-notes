-- Direct browser-to-B2 upload sessions and durable parser artifacts.

CREATE TABLE IF NOT EXISTS upload_sessions (
  id            text PRIMARY KEY,
  workspace_id  text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  chapter_id    text REFERENCES chapters(id) ON DELETE SET NULL,
  object_path   text NOT NULL UNIQUE,
  final_path    text NOT NULL UNIQUE,
  name          text NOT NULL,
  kind          text NOT NULL,
  content_type  text NOT NULL DEFAULT 'application/octet-stream',
  declared_size bigint NOT NULL CHECK (declared_size >= 0),
  parse_mode    text NOT NULL,
  status        text NOT NULL DEFAULT 'pending',
  source_etag   text,
  file_id       text REFERENCES files(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  completed_at  timestamptz
);
CREATE INDEX IF NOT EXISTS upload_sessions_expiry_idx
  ON upload_sessions(status, expires_at);

ALTER TABLE files ADD COLUMN IF NOT EXISTS parsed_blob_path text;
ALTER TABLE files ADD COLUMN IF NOT EXISTS parsed_fingerprint text;
ALTER TABLE files ADD COLUMN IF NOT EXISTS parsed_parser_version text;
ALTER TABLE files ADD COLUMN IF NOT EXISTS source_etag text;
