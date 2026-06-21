import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Panel, PageHeader, Toolbar } from '@/components/app/layout';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Icon,
  IconButton,
  Input,
  Menu,
  Modal,
  Spinner,
  Text,
} from '@/components/ui';
import { colorPair, WORKSPACE_COLORS } from '@/lib/workspaceColor';
import {
  useCreateWorkspace,
  useDeleteWorkspace,
  useUpdateWorkspace,
  useWorkspaceStats,
  useWorkspaces,
} from '@/api/hooks';
import { WorkspaceFormModal } from '@/features/workspaces/WorkspaceFormModal';
import type { Workspace } from '@/api/types';
import { m } from '@/i18n';

const SORTS = [
  { value: 'accessed', label: m.workspaces_sort_accessed },
  { value: 'created', label: m.workspaces_sort_created },
  { value: 'chapters', label: m.workspaces_sort_chapters },
  { value: 'files', label: m.workspaces_sort_files },
];

function StatsModal({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const { data } = useWorkspaceStats(id);
  const rows = [
    ['Chapters', data?.chapters],
    ['Files', data?.files],
    ['Quizzes', data?.quizzes],
    ['Attempts', data?.attempts],
    ['Average score', data ? `${data.avgScore}%` : undefined],
  ] as const;
  return (
    <Modal open={open} onClose={onClose} title="Workspace statistics" width={420}>
      <div className="grid grid-cols-2 gap-3">
        {rows.map(([label, val]) => (
          <div key={label} className="rounded-card border border-line bg-inset px-4 py-3">
            <Text variant="label" tone="muted">{label}</Text>
            <Text variant="section" className="mt-1">{val ?? '—'}</Text>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default function Workspaces() {
  const [sort, setSort] = useState('accessed');
  const [colorFilter, setColorFilter] = useState<string | undefined>();
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { data, isLoading } = useWorkspaces({ sort, color: colorFilter, q: query });
  const create = useCreateWorkspace();
  const update = useUpdateWorkspace();
  const del = useDeleteWorkspace();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Workspace | null>(null);
  const [stats, setStats] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Workspace | null>(null);

  const sortLabel = useMemo(() => SORTS.find((s) => s.value === sort)?.label() ?? '', [sort]);

  return (
    <Panel>
      <PageHeader
        title={m.workspaces_title()}
        actions={<IconButton icon="plus" variant="dark" onClick={() => setCreating(true)} label={m.action_new_workspace()} />}
      />

      <div className="flex items-center justify-between gap-3 px-6 pb-3">
        <Toolbar>
          <Menu
            align="start"
            trigger={
              <Button variant="outline" size="sm" iconLeft="filter" iconRight="chevronDown">
                Sort: {sortLabel}
              </Button>
            }
            items={SORTS.map((s) => ({ label: s.label(), onClick: () => setSort(s.value) }))}
          />
          <Menu
            align="start"
            trigger={
              <Button variant="outline" size="sm" iconRight="chevronDown">
                {colorFilter ? `Color: ${colorFilter}` : m.workspaces_filter_color()}
              </Button>
            }
            items={[
              { label: 'All colors', onClick: () => setColorFilter(undefined) },
              ...WORKSPACE_COLORS.map((c) => ({ label: c, onClick: () => setColorFilter(c) })),
            ]}
          />
        </Toolbar>
        <div className="flex items-center gap-2">
          {showSearch ? (
            <Input
              icon="search"
              size="sm"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => !query && setShowSearch(false)}
              placeholder="Name or tag"
              wrapperClassName="w-56"
            />
          ) : (
            <IconButton icon="search" variant="outline" size="sm" onClick={() => setShowSearch(true)} label="Search workspaces" />
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
        {isLoading ? (
          <div className="grid place-items-center py-16"><Spinner /></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.map((w) => {
              const c = colorPair(w.color);
              return (
                <Card key={w.id} padding={20} radius="card-lg" className="group relative">
                  <Link to="/workspaces/$workspaceId" params={{ workspaceId: w.id }} preload="intent" className="block">
                    <div className="flex items-start justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-card" style={{ background: c.bg, color: c.fg }}>
                        <Icon name="workspaces" size={20} />
                      </span>
                    </div>
                    <Text variant="card-title" className="mt-3 truncate">{w.name}</Text>
                    <Text variant="meta" tone="muted" className="mt-1">{w.chapterCount} chapters · {w.fileCount} files</Text>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {w.tags.map((t) => (
                        <Badge key={t} tone="neutral" size="sm">#{t}</Badge>
                      ))}
                      {w.privacy !== 'private' && (
                        <Badge tone={w.privacy === 'public' ? 'success' : 'info'} size="sm">{w.privacy === 'public' ? 'Public' : 'Shared'}</Badge>
                      )}
                    </div>
                  </Link>
                  <div className="absolute right-3 top-3">
                    <Menu
                      items={[
                        { label: m.action_edit(), icon: 'settings', onClick: () => setEditing(w) },
                        { label: m.action_view_stats(), icon: 'quiz', onClick: () => setStats(w.id) },
                        { label: m.action_delete(), icon: 'trash', danger: true, onClick: () => setDeleting(w) },
                      ]}
                    />
                  </div>
                </Card>
              );
            })}
            <Card dashed radius="card-lg" padding={20} interactive onClick={() => setCreating(true)} className="grid min-h-[150px] place-items-center">
              <span className="flex flex-col items-center gap-2 text-fg-muted">
                <Icon name="plus" size={24} />
                <Text variant="meta" tone="muted">{m.action_new_workspace()}</Text>
              </span>
            </Card>
          </div>
        )}
      </div>

      <WorkspaceFormModal open={creating} onClose={() => setCreating(false)} onSubmit={(v) => { create.mutate(v); setCreating(false); }} />
      {editing && (
        <WorkspaceFormModal
          open
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(v) => { update.mutate({ id: editing.id, ...v }); setEditing(null); }}
        />
      )}
      {stats && <StatsModal id={stats} open onClose={() => setStats(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && del.mutate(deleting.id)}
        title={deleting ? m.confirm_delete_title({ name: deleting.name }) : ''}
        body={m.confirm_delete_body()}
      />
    </Panel>
  );
}
