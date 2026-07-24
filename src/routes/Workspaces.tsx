import { useTags, useWorkspaces } from '@/api/hooks';
import { PageHeader, PanelWithInvertedRadius, Toolbar } from '@/components/app/layout';
import {
  Badge,
  Button,
  Card,
  Icon,
  IconButton,
  Input,
  Menu,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SkeletonCardGrid,
  UserColorChooser,
  WorkspaceCard,
} from '@/components/ui';
import { m } from '@/i18n';
import { cn } from '@/lib/cn';
import { useDialogs } from '@/stores/dialogs';
import { useMemo, useState } from 'react';

const SORTS = [
  { value: 'accessed', label: m.workspaces_sort_accessed },
  { value: 'created', label: m.workspaces_sort_created },
  { value: 'chapters', label: m.workspaces_sort_chapters },
  { value: 'files', label: m.workspaces_sort_files },
];

function toggleIn(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function Workspaces() {
  const [sort, setSort] = useState('accessed');
  const [colorFilters, setColorFilters] = useState<string[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data, isLoading } = useWorkspaces({
    sort,
    color: colorFilters,
    tag: tagFilters,
    q: query,
  });
  const { data: tags = [] } = useTags('workspace');
  const openWorkspaceCreate = useDialogs((s) => s.openWorkspaceCreate);

  const sortLabel = useMemo(() => SORTS.find((s) => s.value === sort)?.label() ?? '', [sort]);
  const hasFilters = colorFilters.length > 0 || tagFilters.length > 0;
  const filterLabel = useMemo(() => {
    const parts = [...colorFilters, ...tagFilters];
    if (!parts.length) return m.workspaces_filter();
    if (parts.length <= 2) return parts.join(' · ');
    return `${parts.slice(0, 2).join(' · ')} +${parts.length - 2}`;
  }, [colorFilters, tagFilters]);

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
              <Button variant="ghost" size="md" iconRight="chevronDown" className="px-1">
                Sort: {sortLabel}
              </Button>
            }
            items={SORTS.map((s) => ({
              label: s.label(),
              onClick: () => setSort(s.value),
            }))}
          />
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="md"
                iconLeft="filter"
                iconRight="chevronDown"
                className="px-1"
              >
                {filterLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-80 w-72 gap-0 p-0">
              <Card radius="card" border="solid" className="max-h-80 gap-3 overflow-y-auto p-3">
                <section className="flex flex-col gap-2">
                  <h3 className="t-meta text-fg-muted">{m.workspaces_filter_color()}</h3>
                  <UserColorChooser
                    selected={colorFilters}
                    onChange={(c) => setColorFilters((prev) => toggleIn(prev, c))}
                  />
                </section>

                <section className="flex flex-col gap-2">
                  <h3 className="t-meta text-fg-muted">{m.workspaces_filter_tags()}</h3>
                  {tags.length === 0 ? (
                    <p className="text-sm text-fg-muted">{m.workspaces_filter_no_tags()}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t) => {
                        const active = tagFilters.includes(t.value);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTagFilters((prev) => toggleIn(prev, t.value))}
                          >
                            <Badge
                              size="sm"
                              tone={active ? 'dark' : 'neutral'}
                              className={cn(
                                'transition-colors',
                                !active && 'hover:bg-surface-hover-bg'
                              )}
                            >
                              {t.value}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  disabled={!hasFilters}
                  onClick={() => {
                    setColorFilters([]);
                    setTagFilters([]);
                  }}
                >
                  {m.workspaces_filter_reset()}
                </Button>
              </Card>
            </PopoverContent>
          </Popover>
        </Toolbar>
        {/* Leave the dedicated search inside of workspace out, user can use the global search in topinsetbar instead */}
        {/* <div className="flex items-center gap-2">
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
        </div> */}
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
              interactive
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
