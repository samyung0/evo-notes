-- Auth, billing, OAuth, and multi-tenancy.

ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id text UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id);
UPDATE workspaces SET user_id = 'u_1' WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS workspaces_user_idx ON workspaces(user_id);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id);
UPDATE tasks SET user_id = 'u_1' WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS tasks_user_idx ON tasks(user_id);

ALTER TABLE events ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id);
UPDATE events SET user_id = 'u_1' WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS events_user_idx ON events(user_id);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id);
UPDATE notifications SET user_id = 'u_1' WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);

ALTER TABLE canvases ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id);
UPDATE canvases SET user_id = 'u_1' WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS canvases_user_idx ON canvases(user_id);

CREATE TABLE IF NOT EXISTS oauth_connections (
  id            text PRIMARY KEY,
  user_id       text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider      text NOT NULL,
  access_token  text NOT NULL,
  refresh_token text,
  expires_at    timestamptz,
  scopes        text,
  account_email text,
  UNIQUE(user_id, provider)
);
CREATE INDEX IF NOT EXISTS oauth_connections_user_idx ON oauth_connections(user_id);

CREATE TABLE IF NOT EXISTS webhook_events (
  id           text PRIMARY KEY,
  source       text NOT NULL,
  event_type   text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}',
  processed_at timestamptz,
  error        text
);
CREATE INDEX IF NOT EXISTS webhook_events_source_idx ON webhook_events(source, processed_at);
