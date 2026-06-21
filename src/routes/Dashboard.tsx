import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Panel, RightRail } from '@/components/app/layout';
import { TopInsetBar } from '@/components/app/TopInsetBar';
import { MiniCalendar } from '@/features/schedule/MiniCalendar';
import { Badge, Card, Checkbox, Icon, Text, Spinner } from '@/components/ui';
import { colorPair } from '@/lib/workspaceColor';
import { useCanvases, useMe, useTasks, useToggleTask, useWorkspaces } from '@/api/hooks';
import { m } from '@/i18n';

function StreakHeading() {
  const { data: me } = useMe();
  const streak = me?.streak ?? 0;
  return (
    <div>
      <Text variant="page-title">{streak > 0 ? m.dashboard_streak_days({ count: streak }) : m.dashboard_streak_none()}</Text>
      <Text variant="body" tone="secondary" className="mt-1">
        Pick up where you left off, {me?.name?.split(' ')[0] ?? 'there'}.
      </Text>
    </div>
  );
}

function Banner() {
  return (
    <div className="relative overflow-hidden rounded-card-lg bg-tint-purple px-6 py-7">
      <div className="relative z-10 max-w-[60%]">
        <Text variant="subtitle" className="text-tint-purple-fg">
          Turn your sources into summaries, flashcards & quizzes
        </Text>
        <Text variant="meta" className="mt-1 text-tint-purple-fg/80">
          Upload a file, then chat or generate — grounded in your own materials.
        </Text>
      </div>
      <Icon name="sparkles" size={120} className="absolute -right-4 -top-3 text-tint-purple-fg/15" />
    </div>
  );
}

function WorkspacesSection() {
  const { data, isLoading } = useWorkspaces({ sort: 'accessed' });
  const recent = data?.slice(0, 4);
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <Text variant="section">{m.dashboard_workspaces()}</Text>
        <Link to="/workspaces" preload="intent" className="text-sm font-semibold text-link hover:text-link-hover">
          {m.action_see_all()}
        </Link>
      </div>
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {recent?.map((w) => {
            const c = colorPair(w.color);
            return (
              <Link key={w.id} to="/workspaces/$workspaceId" params={{ workspaceId: w.id }} preload="intent">
                <Card interactive padding={16} className="flex h-full items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card" style={{ background: c.bg, color: c.fg }}>
                    <Icon name="workspaces" size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Text variant="card-title" className="truncate">{w.name}</Text>
                    <Text variant="meta" tone="muted" className="mt-0.5">
                      {w.chapterCount} chapters · {w.fileCount} files
                    </Text>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {w.tags.slice(0, 2).map((t) => (
                        <Badge key={t} tone="neutral" size="sm">#{t}</Badge>
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
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <Text variant="section">{m.dashboard_thinking()}</Text>
        <Link to="/thinking" preload="intent" className="text-sm font-semibold text-link hover:text-link-hover">
          {m.action_see_all()}
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data?.slice(0, 2).map((c, i) => (
          <Link key={c.id} to="/thinking/$canvasId" params={{ canvasId: c.id }} preload="intent">
            <div
              className="flex min-h-[120px] flex-col justify-between rounded-card-lg p-5"
              style={{ background: i % 2 ? 'var(--note-purple-bg)' : 'var(--note-green-bg)', color: i % 2 ? 'var(--note-purple-fg)' : 'var(--note-green-fg)' }}
            >
              <Text variant="subtitle" className="text-inherit">{c.name}</Text>
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
  const open = data?.filter((t) => !t.done) ?? [];
  return (
    <Panel scroll={false} className="shrink-0">
      <div className="flex items-center justify-between px-4 pt-4">
        <Text variant="subtitle">{m.dashboard_tasks()}</Text>
        <Link to="/tasks" preload="intent" className="text-xs font-semibold text-link hover:text-link-hover">
          {m.action_see_all()}
        </Link>
      </div>
      <div className="flex flex-col gap-1 p-3">
        {!open.length && <Text variant="body" tone="muted" className="px-1 py-2">{m.tasks_empty()}</Text>}
        {data?.map((t) => (
          <button
            key={t.id}
            onClick={() => toggle.mutate({ id: t.id, done: !t.done })}
            className="flex items-start gap-3 rounded-row px-1 py-2 text-left hover:bg-inset"
          >
            <Checkbox checked={t.done} tone="purple" size={22} />
            <span className="min-w-0">
              <span className={t.done ? 'block text-sm font-medium text-fg-muted line-through' : 'block text-sm font-medium text-fg'}>{t.title}</span>
              {t.meta && <span className="block text-xs text-fg-muted">{t.meta}</span>}
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

export default function Dashboard() {
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());

  return (
    <div className="flex h-full min-h-0 gap-2.5">
      <Panel className="flex-1">
        <div className="flex flex-col gap-6 overflow-auto px-6 py-6">
          <StreakHeading />
          <Banner />
          <WorkspacesSection />
          <ThinkingSection />
        </div>
      </Panel>

      <RightRail>
        <TopInsetBar />
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto">
          <TasksCard />
          <MiniCalendar month={month} onMonthChange={setMonth} selected={selected} onSelect={setSelected} />
        </div>
      </RightRail>
    </div>
  );
}
