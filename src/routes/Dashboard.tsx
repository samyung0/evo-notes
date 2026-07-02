import { Link } from '@tanstack/react-router';
import { Panel, RightRail } from '@/components/app/layout';
import { TopInsetBar } from '@/components/app/TopInsetBar';
import { DashboardCalendar } from '@/features/schedule/DashboardCalendar';
import {
  Badge,
  Card,
  Checkbox,
  HoverActions,
  Icon,
  Button,
  WorkspaceCard,
  WorkspaceCardSkeleton,
} from '@/components/ui';
import { userColorPair } from '@/lib/userColor';
import {
  useCanvases,
  useDeleteTask,
  useMe,
  useTasks,
  useToggleTask,
  useWorkspaces,
} from '@/api/hooks';
import { useDialogs } from '@/stores/dialogs';
import { m } from '@/i18n';
import DashboardDefaultBanner from '@/components/banners/DashboardDefaultBanner';
import { CloudConnectBanner } from '@/components/app/CloudConnectBanner';
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

const DASHBOARD_WORKSPACE_LIMIT = 12;

function WorkspacesSection() {
  const { data, isLoading } = useWorkspaces({ sort: 'accessed' });
  const recent = data?.slice(0, DASHBOARD_WORKSPACE_LIMIT);
  const hasMore = (data?.length ?? 0) > DASHBOARD_WORKSPACE_LIMIT;
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
        <div className="grid w-full auto-rows-fr grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {Array.from({ length: DASHBOARD_WORKSPACE_LIMIT }).map((_, i) => (
            <WorkspaceCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid w-full auto-rows-fr grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {recent?.map((w) => (
            <WorkspaceCard key={w.id} workspace={w} />
          ))}
          {hasMore && (
            <div className="flex items-center justify-center p-5">
              <Button variant="ghost-link" size="md" asChild className="p-0">
                <Link to="/workspaces" preload="intent">
                  <span className="flex items-center gap-2">
                    {m.action_see_all()}
                    <Icon name="arrowRight" size={16} />
                  </span>
                </Link>
              </Button>
            </div>
          )}
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
      <div className="grid w-full auto-rows-fr grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
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
  const remove = useDeleteTask();
  const openTaskEdit = useDialogs((s) => s.openTaskEdit);
  const openConfirm = useDialogs((s) => s.openConfirm);
  const open = data?.filter((t) => !t.done) ?? [];
  const visible = data?.slice(0, 4) ?? [];
  const hasMore = (data?.length ?? 0) > visible.length;
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
        {visible.map((t) => (
          <div
            key={t.id}
            className="group flex items-start gap-3 rounded-row px-1 py-2 hover:bg-surface-hover-bg"
          >
            <Checkbox
              checked={t.done}
              tone="purple"
              size={22}
              className={cn(t.meta && 'translate-y-1')}
            />
            <button
              onClick={() => toggle.mutate({ id: t.id, done: !t.done })}
              className="flex min-w-0 flex-1 items-start gap-3 text-left"
            >
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
            <HoverActions
              items={[
                {
                  label: m.action_edit(),
                  icon: 'notes',
                  onClick: () => openTaskEdit(t),
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
                  onClick: () =>
                    openConfirm({
                      title: m.confirm_delete_title({ name: t.title }),
                      body: m.confirm_delete_body(),
                      onConfirm: () => remove.mutate(t.id),
                    }),
                },
              ]}
            />
          </div>
        ))}
        {hasMore && (
          <Link
            to="/tasks"
            preload="intent"
            className="px-1 py-1 text-center text-lg leading-none font-bold text-fg-muted hover:text-fg"
            aria-label={m.action_see_all()}
          >
            …
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="flex h-full min-h-full flex-col gap-1.5 sm:gap-2.5 lg:flex-row">
      <Panel
        className="order-last min-h-0 flex-1 rounded-row lg:order-first lg:rounded-card-xl"
        sectionClassName="gap-5 sm:gap-6 p-4 sm:p-6"
      >
        <StreakHeading />
        <CloudConnectBanner />
        <DashboardDefaultBanner />
        <WorkspacesSection />
        {/* <ThinkingSection /> */}
      </Panel>

      <RightRail className="order-first h-auto min-h-0 w-full shrink-0 overflow-visible lg:order-last lg:h-full lg:min-h-full lg:w-75 lg:overflow-hidden xl:w-90">
        <TopInsetBar />
        <Panel className="hidden min-h-0 flex-1 lg:flex" sectionClassName="gap-2.5 p-5">
          <TasksCard />
          <DashboardCalendar />
        </Panel>
      </RightRail>
    </div>
  );
}
