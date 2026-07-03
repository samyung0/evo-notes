import { Workspace } from '@/api/types';
import { userColorPair } from '@/lib/userColor';
import { Link } from '@tanstack/react-router';
import { Badge } from './Badge';
import { Card } from './Card';
import { Icon } from './Icon';
import { Skeleton } from './feedback';
import { Menu } from '@/components/ui/Menu';
import { m } from '@/i18n';
import { useDeleteWorkspace } from '@/api/hooks';
import { useDialogs } from '@/stores/dialogs';
import { cn } from '@/lib/cn';

export function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  const c = userColorPair(workspace.color);
  const del = useDeleteWorkspace();
  const openWorkspaceEdit = useDialogs((s) => s.openWorkspaceEdit);
  // const openWorkspaceStats = useDialogs((s) => s.openWorkspaceStats);
  const openConfirm = useDialogs((s) => s.openConfirm);
  return (
    <div className="relative">
      <Link
        key={workspace.id}
        to="/workspaces/$workspaceId"
        params={{ workspaceId: workspace.id }}
        preload="intent"
      >
        <Card interactive border="solid" className="relative gap-4 p-4.5 xl:p-5.5">
          <span
            className={cn('size-fit rounded-card p-3', workspace.color === 'transparent' && 'px-1')}
            style={{ background: c.bg, color: c.fg }}
          >
            <Icon
              name="workspaces"
              className={cn('size-5.5', workspace.color === 'transparent' && 'size-6')}
            />
          </span>
          <div className="flex-1">
            <h3 className="t-card-title truncate">{workspace.name}</h3>
            <p className="t-meta mt-1 text-fg-muted">
              {workspace.chapterCount} chapters · {workspace.fileCount} files
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {workspace.tags.slice(0, 3).map((t) => (
                <Badge key={t.value} tone="neutral" size="sm">
                  # {t.value}
                </Badge>
              ))}
              {workspace.privacy !== 'private' && (
                <Badge tone={workspace.privacy === 'public' ? 'success' : 'info'} size="sm">
                  {workspace.privacy === 'public' ? 'Public' : 'Shared'}
                </Badge>
              )}
            </div>
          </div>
        </Card>
      </Link>
      <div className="absolute top-3 right-3 z-50">
        <Menu
          items={[
            {
              label: m.action_edit(),
              icon: 'settings',
              onClick: () => openWorkspaceEdit(workspace, workspace.id),
            },
            // {
            //   label: m.action_view_stats(),
            //   icon: 'quiz',
            //   onClick: () => openWorkspaceStats(workspace.id),
            // },
            {
              label: m.action_delete(),
              icon: 'trash',
              danger: true,
              onClick: () =>
                openConfirm({
                  title: m.confirm_delete_title({ name: workspace.name }),
                  body: m.confirm_delete_body(),
                  onConfirm: () => del.mutate(workspace.id),
                }),
            },
          ]}
        />
      </div>
    </div>
  );
}

/** Loading placeholder that mirrors {@link WorkspaceCard}'s footprint. */
export function WorkspaceCardSkeleton() {
  return (
    <Card border="solid" className="gap-4 p-4.5 xl:p-5.5">
      <Skeleton className="size-11 rounded-card" />
      <div className="flex-1">
        <Skeleton className="h-4.5 w-3/5 rounded-row" />
        <Skeleton className="mt-2 h-3 w-2/5 rounded-row" />
        <div className="mt-3.5 flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-pill" />
          <Skeleton className="h-5 w-10 rounded-pill" />
        </div>
      </div>
    </Card>
  );
}
