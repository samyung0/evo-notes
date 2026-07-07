import { useWorkspaces } from '@/api/hooks';
import { PageHeader, PanelWithInvertedRadius, Toolbar } from '@/components/app/layout';
import {
  Button,
  Card,
  Icon,
  IconButton,
  Input,
  Menu,
  SkeletonCardGrid,
  Text,
  WorkspaceCard,
} from '@/components/ui';
import { m } from '@/i18n';
import { USER_COLORS } from '@/lib/userColor';
import { useDialogs } from '@/stores/dialogs';
import { useMemo, useState } from 'react';

const SORTS = [
  { value: 'accessed', label: m.workspaces_sort_accessed },
  { value: 'created', label: m.workspaces_sort_created },
  { value: 'chapters', label: m.workspaces_sort_chapters },
  { value: 'files', label: m.workspaces_sort_files },
];

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
  const openWorkspaceCreate = useDialogs((s) => s.openWorkspaceCreate);

  const sortLabel = useMemo(() => SORTS.find((s) => s.value === sort)?.label() ?? '', [sort]);

  return (
    <PanelWithInvertedRadius>
      <PageHeader
        title={m.workspaces_title()}
        actions={
          <IconButton
            icon="plus"
            variant="gray"
            size="lg"
            onClick={() => openWorkspaceCreate()}
            label={m.action_new_workspace()}
          />
        }
      />

      <div className="flex items-center justify-between gap-3 px-6">
        <Toolbar>
          <Menu
            align="start"
            trigger={
              <Button
                variant="ghost"
                size="md"
                iconLeft="filter"
                iconRight="chevronDown"
                className="px-1"
              >
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
              <Button variant="ghost" size="md" iconRight="chevronDown" className="px-1">
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
              leftIcon="search"
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
              variant="gray"
              size="md"
              onClick={() => setShowSearch(true)}
              label="Search workspaces"
            />
          )}
        </div>
      </div>

      <div className="min-h-0 w-full flex-1 overflow-auto px-6 pt-3 pb-6">
        {isLoading ? (
          <SkeletonCardGrid count={9} />
        ) : (
          <div className="grid w-full auto-rows-fr grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {data?.map((w) => (
              <WorkspaceCard key={w.id} workspace={w} />
            ))}
            <Card
              border="dashed"
              radius="card-lg"
              onClick={() => openWorkspaceCreate()}
              className="min-h-40 cursor-pointer items-center justify-center"
            >
              <span className="flex flex-col items-center gap-2 text-fg-muted">
                <Icon name="plus" size={24} />
                <span className="t-meta text-fg-muted">{m.action_new_workspace()}</span>
              </span>
            </Card>
          </div>
        )}
      </div>
    </PanelWithInvertedRadius>
  );
}
