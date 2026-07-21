-- Workspace link/public permissions and identity-bound invitations.

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS share_role text NOT NULL DEFAULT 'viewer';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workspaces_share_role_check'
      AND conrelid = 'workspaces'::regclass
  ) THEN
    ALTER TABLE workspaces
      ADD CONSTRAINT workspaces_share_role_check
      CHECK (share_role IN ('viewer', 'commenter', 'editor'));
  END IF;
END $$;

ALTER TABLE workspace_invites
  ADD COLUMN IF NOT EXISTS invited_user_id text REFERENCES users(id) ON DELETE CASCADE;

-- Preserve existing invitations while binding any whose display email resolves
-- unambiguously to an existing account. All newly-created invitations are
-- identity-bound by the application.
UPDATE workspace_invites wi
SET invited_user_id = matched.user_id
FROM (
  SELECT lower(email) AS email, min(id) AS user_id
  FROM users
  GROUP BY lower(email)
  HAVING count(*) = 1
) matched
WHERE wi.invited_user_id IS NULL
  AND lower(wi.email) = matched.email;

DROP INDEX IF EXISTS workspace_invites_pending_email_idx;
CREATE UNIQUE INDEX IF NOT EXISTS workspace_invites_pending_user_idx
  ON workspace_invites(workspace_id, invited_user_id)
  WHERE accepted_at IS NULL
    AND revoked_at IS NULL
    AND invited_user_id IS NOT NULL;
