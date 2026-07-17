-- Editor media stored directly in Backblaze B2.
--
-- The browser uploads to a short-lived, server-reserved object URL. Plate
-- documents persist only the stable editor_assets.id; read URLs are resolved
-- on demand after workspace/share authorization.

CREATE TABLE IF NOT EXISTS editor_assets (
  id           text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by   text REFERENCES users(id) ON DELETE SET NULL,
  name         text NOT NULL CHECK (length(name) BETWEEN 1 AND 255),
  purpose      text NOT NULL CHECK (purpose IN ('image','audio','video','pdf','file')),
  object_path  text NOT NULL UNIQUE,
  content_type text NOT NULL,
  size_bytes   bigint NOT NULL CHECK (size_bytes > 0),
  status       text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','ready','expired')),
  etag         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (id, workspace_id),
  CHECK (
    (purpose='image' AND size_bytes <= 20971520) OR
    (purpose='audio' AND size_bytes <= 104857600) OR
    (purpose='video' AND size_bytes <= 524288000) OR
    (purpose='pdf' AND size_bytes <= 52428800) OR
    (purpose='file' AND size_bytes <= 104857600)
  ),
  CHECK ((status='ready') = (completed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS editor_assets_workspace_idx
  ON editor_assets(workspace_id, status);

CREATE TABLE IF NOT EXISTS editor_asset_uploads (
  id            text PRIMARY KEY,
  asset_id      text NOT NULL UNIQUE,
  workspace_id  text NOT NULL,
  object_path   text NOT NULL UNIQUE,
  content_type  text NOT NULL,
  declared_size bigint NOT NULL CHECK (declared_size > 0),
  status        text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','expired')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  completed_at  timestamptz,
  FOREIGN KEY (asset_id, workspace_id)
    REFERENCES editor_assets(id, workspace_id) ON DELETE CASCADE,
  CHECK ((status='completed') = (completed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS editor_asset_uploads_expiry_idx
  ON editor_asset_uploads(status, expires_at);
