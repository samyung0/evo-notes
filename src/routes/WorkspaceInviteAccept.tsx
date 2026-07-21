import { useNavigate, useParams } from '@tanstack/react-router';
import { useAcceptWorkspaceInvite } from '@/api/hooks';
import { Button, Icon } from '@/components/ui';
import { PanelWithInvertedRadius } from '@/components/app/layout';

export default function WorkspaceInviteAccept() {
  const { token } = useParams({ strict: false }) as { token: string };
  const navigate = useNavigate();
  const accept = useAcceptWorkspaceInvite();

  return (
    <PanelWithInvertedRadius className="mx-auto w-full max-w-xl">
      <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
        <span className="mb-5 rounded-card bg-tint-accent-1 p-3 text-tint-accent-1-fg">
          <Icon name="workspaces" className="size-6" />
        </span>
        <h1 className="t-section">Workspace invitation</h1>
        <p className="mt-2 max-w-md text-sm text-fg-muted">
          Accept this invitation to join the workspace with the role selected by its owner.
        </p>

        {accept.isError && (
          <p role="alert" className="mt-5 text-sm text-solid-error">
            This invitation is invalid, expired, revoked, or belongs to another account.
          </p>
        )}

        {accept.isSuccess ? (
          <Button
            className="mt-6"
            variant="accent"
            onClick={() =>
              navigate({
                to: '/workspaces/$workspaceId',
                params: { workspaceId: accept.data.workspaceId },
              })
            }
          >
            Open workspace
          </Button>
        ) : (
          <div className="mt-6 flex gap-2">
            <Button variant="ghost-hover" onClick={() => navigate({ to: '/workspaces' })}>
              Cancel
            </Button>
            <Button
              variant="accent"
              disabled={accept.isPending || !token}
              onClick={() => accept.mutate(token)}
            >
              {accept.isPending ? 'Accepting…' : 'Accept invitation'}
            </Button>
          </div>
        )}
      </div>
    </PanelWithInvertedRadius>
  );
}
