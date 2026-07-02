import { useState } from 'react';
import { Panel, PageHeader, PanelWithInvertedRadius } from '@/components/app/layout';
import { Badge, Button, Card, Icon, SkeletonCardGrid, Tabs, Text } from '@/components/ui';
import { userColorPair } from '@/lib/userColor';
import { useExploreQuizzes, useExploreWorkspaces } from '@/api/hooks';
import { m } from '@/i18n';

export default function Explore() {
  const [tab, setTab] = useState('workspaces');
  const ws = useExploreWorkspaces();
  const qz = useExploreQuizzes();

  return (
    <PanelWithInvertedRadius>
      <PageHeader
        title={m.nav_explore()}
        subtitle="Discover public study sets from the community."
      />
      <div className="px-6">
        <Tabs
          tabs={[
            { value: 'workspaces', label: m.explore_tab_workspaces() },
            { value: 'quizzes', label: m.explore_tab_quizzes() },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        {tab === 'workspaces' ? (
          ws.isLoading ? (
            <SkeletonCardGrid count={6} cardHeight={170} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ws.data?.map((w) => {
                const c = userColorPair(w.color);
                return (
                  <Card key={w.id} radius="card-lg" className="p-5.5">
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-card"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      <Icon name="workspaces" size={20} />
                    </span>
                    <Text variant="card-title" className="mt-3 truncate">
                      {w.name}
                    </Text>
                    <Text variant="meta" tone="muted" className="mt-1">
                      by {w.author} · {w.clones.toLocaleString()} clones
                    </Text>
                    <Button size="sm" variant="outline" className="mt-3" iconLeft="plus">
                      Clone to my library
                    </Button>
                  </Card>
                );
              })}
            </div>
          )
        ) : qz.isLoading ? (
          <SkeletonCardGrid count={6} cardHeight={190} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {qz.data?.map((q) => (
              <Card key={q.id} radius="card-lg" className="p-5.5">
                <span className="flex h-11 w-11 items-center justify-center rounded-card bg-tint-accent-1 text-tint-accent-1-fg">
                  <Icon name="quiz" size={20} />
                </span>
                <Text variant="card-title" className="mt-3 truncate">
                  {q.name}
                </Text>
                <Text variant="meta" tone="muted" className="mt-1">
                  by {q.author} · {q.clones.toLocaleString()} clones
                </Text>
                <div className="mt-2">
                  <Badge tone="neutral" size="sm">
                    {q.questions.length} questions
                  </Badge>
                </div>
                <Button size="sm" variant="outline" className="mt-3" iconLeft="plus">
                  Clone to my library
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PanelWithInvertedRadius>
  );
}
