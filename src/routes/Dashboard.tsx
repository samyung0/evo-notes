import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Panel, RightRail } from '@/components/app/layout';
import { TopInsetBar } from '@/components/app/TopInsetBar';
import { MiniCalendar } from '@/features/schedule/MiniCalendar';
import { Badge, Card, Checkbox, Icon, Menu, Text, Spinner, Button } from '@/components/ui';
import { userColorPair } from '@/lib/workspaceColor';
import {
  useCanvases,
  useDeleteTask,
  useMe,
  useTasks,
  useToggleTask,
  useUpdateTask,
  useWorkspaces,
} from '@/api/hooks';
import { m } from '@/i18n';
import DashboardDefaultBanner from '@/components/banners/DashboardDefaultBanner';
import { cn } from '@/lib/cn';

function StreakHeading() {
  const { data: me } = useMe();
  const streak = me?.streak ?? 0;
  return (
    <div>
      <h2 className="t-page-title">
        {streak > 0 ? m.dashboard_streak_days({ count: streak }) : m.dashboard_streak_none()}
      </h2>
      <p className="t-subtitle mt-1 text-fg-muted">
        Take a look around — your workspaces, notes and itinerary will show up here.
      </p>
    </div>
  );
}

function WorkspacesSection() {
  const { data, isLoading } = useWorkspaces({ sort: 'accessed' });
  const recent = data;
  // const recent = data?.slice(0, 2);
  // TODO: do a UI design to let user know there are more data, possible bottom shadows
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="t-section">{m.dashboard_workspaces()}</h2>
        <Button variant="ghost-link" size="md" asChild className="p-0">
          <Link to="/workspaces" preload="intent">
            {m.action_go_workspaces()}
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(256px,1fr))] gap-4">
          {recent?.map((w) => {
            const c = userColorPair(w.color);
            return (
              <Link
                key={w.id}
                to="/workspaces/$workspaceId"
                params={{ workspaceId: w.id }}
                preload="intent"
              >
                <Card interactive border="solid" className="flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card"
                    style={{ background: c.bg, color: c.fg }}
                  >
                    <Icon name="workspaces" size={22} />
                  </span>
                  <div className="flex-1">
                    <h3 className="t-card-title truncate">{w.name}</h3>
                    <p className="t-meta mt-1.5 text-fg-muted">
                      {w.chapterCount} chapters · {w.fileCount} files
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {w.tags.slice(0, 2).map((t) => (
                        <Badge key={t} tone="neutral" size="sm">
                          # {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ThinkingSection() {
  const { data } = useCanvases();
  // TODO excess data hint
  const recent = data;
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="t-section">{m.dashboard_thinking()}</h2>
        <Link
          to="/thinking"
          preload="intent"
          className="text-sm font-semibold text-link hover:text-link-hover"
        >
          {m.action_see_all()}
        </Link>
      </div>
      <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
        {recent?.map((c, i) => (
          <Link key={c.id} to="/thinking/$canvasId" params={{ canvasId: c.id }} preload="intent">
            {/* TODO fix notes in thinking space */}
            <div
              className="flex min-h-28 flex-col justify-between rounded-card-lg p-5"
              style={{
                background: i % 2 ? 'var(--note-purple-bg)' : 'var(--note-green-bg)',
                color: i % 2 ? 'var(--note-purple-fg)' : 'var(--note-green-fg)',
              }}
            >
              <h4 className="t-subtitle text-inherit">{c.name}</h4>
              <span className="flex items-center gap-1.5 text-[0.72rem] opacity-70">
                <Icon name="notes" size={13} /> Updated {new Date(c.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TasksCard() {
  const { data } = useTasks();
  const toggle = useToggleTask();
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const open = data?.filter((t) => !t.done) ?? [];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="t-card-title">{m.dashboard_tasks()}</h3>
        <Link
          to="/tasks"
          preload="intent"
          className="text-sm font-semibold text-link hover:text-link-hover"
        >
          {m.action_see_all()}
        </Link>
      </div>
      <div className="flex flex-col gap-1">
        {!open.length && (
          <p className="t-body px-1 pt-2 pb-4 text-center text-fg-muted">{m.tasks_empty()}</p>
        )}
        {data?.map((t) => (
          <div
            key={t.id}
            className="group flex items-start gap-3 rounded-row px-1 py-2 hover:bg-surface-hover-bg"
          >
            <button
              onClick={() => toggle.mutate({ id: t.id, done: !t.done })}
              className="flex min-w-0 flex-1 items-start gap-3 text-left"
            >
              <Checkbox
                checked={t.done}
                tone="purple"
                size={22}
                className={cn(t.meta && 'translate-y-1')}
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    t.done
                      ? 't-body block font-semibold text-fg-muted line-through'
                      : 't-body block font-semibold text-fg',
                    'line-clamp-2',
                    !t.meta && 'translate-y-1'
                  )}
                >
                  {t.title}
                </span>
                {t.meta && <span className="t-body block text-fg-muted">{t.meta}</span>}
              </span>
            </button>
            <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100">
              <Menu
                items={[
                  {
                    label: m.action_edit(),
                    icon: 'notes',
                    onClick: () => {
                      const title = prompt(m.action_edit(), t.title);
                      if (title && title !== t.title) update.mutate({ id: t.id, title });
                    },
                  },
                  {
                    label: t.done ? m.action_mark_undone() : m.action_mark_done(),
                    icon: 'check',
                    onClick: () => toggle.mutate({ id: t.id, done: !t.done }),
                  },
                  {
                    label: m.action_delete(),
                    icon: 'trash',
                    danger: true,
                    onClick: () => remove.mutate(t.id),
                  },
                ]}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());

  return (
    <div className="flex h-full min-h-full flex-col gap-1.5 sm:gap-2.5 lg:flex-row">
      <Panel className="order-last min-h-0 flex-1 gap-5 rounded-card p-4 sm:gap-6 sm:rounded-card-xl sm:p-6 lg:order-first">
        <StreakHeading />
        <DashboardDefaultBanner />
        <WorkspacesSection />
        <ThinkingSection />
      </Panel>

      <RightRail className="order-first h-auto min-h-0 w-full shrink-0 overflow-visible lg:order-last lg:h-full lg:min-h-full lg:w-90 lg:overflow-hidden">
        <TopInsetBar className="rounded-card sm:rounded-card-lg" />
        <Panel className="hidden min-h-0 flex-1 gap-2.5 p-5 lg:flex">
          <TasksCard />
          <MiniCalendar
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={setSelected}
          />
        </Panel>
      </RightRail>
    </div>
  );
}
