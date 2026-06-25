import { Workspace } from '@/api/types';
import { userColorPair } from '@/lib/workspaceColor';
import { Link } from '@tanstack/react-router';
import { Badge } from './Badge';
import { Card } from './Card';
import { Icon } from './Icon';

export function WorkspaceCard({
  workspace,
  customComponent,
}: {
  workspace: Workspace;
  customComponent?: React.ReactNode;
}) {
  const c = userColorPair(workspace.color);
  return (
    <div className="relative">
      <Link
        key={workspace.id}
        to="/workspaces/$workspaceId"
        params={{ workspaceId: workspace.id }}
        preload="intent"
      >
        <Card interactive border="solid" className="relative gap-3 p-4.5 xl:p-5.5">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card"
            style={{ background: c.bg, color: c.fg }}
          >
            <Icon name="workspaces" size={22} />
          </span>
          <div className="flex-1">
            <h3 className="t-card-title truncate">{workspace.name}</h3>
            <p className="t-meta mt-1 text-fg-muted">
              {workspace.chapterCount} chapters · {workspace.fileCount} files
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {workspace.tags.slice(0, 2).map((t) => (
                <Badge key={t} tone="neutral" size="sm">
                  # {t}
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
      {customComponent}
    </div>
  );
}
