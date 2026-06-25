import { useCallback, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Panel, PageHeader, Toolbar, PanelWithInvertedRadius } from '@/components/app/layout';
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
  WorkspaceCard,
} from '@/components/ui';
import { userColorPair, USER_COLORS } from '@/lib/workspaceColor';
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
          <div
            key={label}
            className="rounded-card border border-line bg-surface-hover-bg px-4 py-3"
          >
            <Text variant="label" tone="muted">
              {label}
            </Text>
            <Text variant="section" className="mt-1">
              {val ?? '—'}
            </Text>
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

  const { data, isLoading } = useWorkspaces({
    sort,
    color: colorFilter,
    q: query,
  });
  const create = useCreateWorkspace();
  const update = useUpdateWorkspace();
  const del = useDeleteWorkspace();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Workspace | null>(null);
  const [stats, setStats] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Workspace | null>(null);

  const sortLabel = useMemo(() => SORTS.find((s) => s.value === sort)?.label() ?? '', [sort]);

  const ActionMenu = useCallback(({ w }: { w: Workspace }) => {
    return (
      <div className="absolute top-3 right-3 z-50">
        <Menu
          items={[
            {
              label: m.action_edit(),
              icon: 'settings',
              onClick: () => setEditing(w),
            },
            {
              label: m.action_view_stats(),
              icon: 'quiz',
              onClick: () => setStats(w.id),
            },
            {
              label: m.action_delete(),
              icon: 'trash',
              danger: true,
              onClick: () => setDeleting(w),
            },
          ]}
        />
      </div>
    );
  }, []);

  return (
    <PanelWithInvertedRadius>
      <PageHeader
        title={m.workspaces_title()}
        actions={
          <IconButton
            icon="plus"
            variant="outline"
            size="lg"
            onClick={() => setCreating(true)}
            label={m.action_new_workspace()}
          />
        }
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
            items={SORTS.map((s) => ({
              label: s.label(),
              onClick: () => setSort(s.value),
            }))}
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
              ...USER_COLORS.map((c) => ({
                label: c,
                onClick: () => setColorFilter(c),
              })),
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
            <IconButton
              icon="search"
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(true)}
              label="Search workspaces"
            />
          )}
        </div>
      </div>

      <div className="min-h-0 w-full flex-1 overflow-auto px-6 pb-6">
        {isLoading ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {data?.map((w) => (
              <WorkspaceCard key={w.id} workspace={w} customComponent={<ActionMenu w={w} />} />
            ))}
            {data?.map((w) => (
              <WorkspaceCard key={w.id} workspace={w} customComponent={<ActionMenu w={w} />} />
            ))}
            {data?.map((w) => (
              <WorkspaceCard key={w.id} workspace={w} customComponent={<ActionMenu w={w} />} />
            ))}
            {data?.map((w) => (
              <WorkspaceCard key={w.id} workspace={w} customComponent={<ActionMenu w={w} />} />
            ))}
            {data?.map((w) => (
              <WorkspaceCard key={w.id} workspace={w} customComponent={<ActionMenu w={w} />} />
            ))}
            {data?.map((w) => (
              <WorkspaceCard key={w.id} workspace={w} customComponent={<ActionMenu w={w} />} />
            ))}
            <Card
              dashed
              radius="card-lg"
              padding={20}
              interactive
              onClick={() => setCreating(true)}
              className="grid min-h-[150px] place-items-center"
            >
              <span className="flex flex-col items-center gap-2 text-fg-muted">
                <Icon name="plus" size={24} />
                <Text variant="meta" tone="muted">
                  {m.action_new_workspace()}
                </Text>
              </span>
            </Card>
          </div>
        )}
      </div>

      <WorkspaceFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(v) => {
          create.mutate(v);
          setCreating(false);
        }}
      />
      {editing && (
        <WorkspaceFormModal
          open
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(v) => {
            update.mutate({ id: editing.id, ...v });
            setEditing(null);
          }}
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
    </PanelWithInvertedRadius>
  );
}
