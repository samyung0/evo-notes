import { useState } from 'react';
import { Panel, PageHeader, PanelWithInvertedRadius } from '@/components/app/layout';
import { Badge, Button, Card, Icon, SkeletonCardGrid, Tabs, Text } from '@/components/ui';
import { userColorPair } from '@/lib/userColor';
import {
  useCloneDeck,
  useCloneQuiz,
  useCloneWorkspace,
  useExploreDecks,
  useExploreQuizzes,
  useExploreWorkspaces,
} from '@/api/hooks';
import { m } from '@/i18n';
import { useNavigate } from '@tanstack/react-router';

export default function Explore() {
  const [tab, setTab] = useState('workspaces');
  const ws = useExploreWorkspaces();
  const qz = useExploreQuizzes();
  const decks = useExploreDecks();
  const cloneWorkspace = useCloneWorkspace();
  const cloneQuiz = useCloneQuiz();
  const cloneDeck = useCloneDeck();
  const navigate = useNavigate();

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
            { value: 'decks', label: 'Flashcards' },
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      iconLeft="plus"
                      disabled={cloneWorkspace.isPending}
                      onClick={() =>
                        cloneWorkspace.mutate(w.id, {
                          onSuccess: ({ workspace }) =>
                            navigate({
                              to: '/workspaces/$workspaceId',
                              params: { workspaceId: workspace.id },
                            }),
                        })
                      }
                    >
                      Clone workspace
                    </Button>
                  </Card>
                );
              })}
            </div>
          )
        ) : tab === 'quizzes' && qz.isLoading ? (
          <SkeletonCardGrid count={6} cardHeight={190} />
        ) : tab === 'quizzes' ? (
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
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  iconLeft="plus"
                  disabled={cloneQuiz.isPending}
                  onClick={() =>
                    cloneQuiz.mutate(q.id, {
                      onSuccess: (copy) =>
                        navigate({
                          to: '/quizzes/$quizId/attempt',
                          params: { quizId: copy.id },
                        }),
                    })
                  }
                >
                  Clone quiz
                </Button>
              </Card>
            ))}
          </div>
        ) : decks.isLoading ? (
          <SkeletonCardGrid count={6} cardHeight={190} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.data?.map((deck) => (
              <Card key={deck.id} radius="card-lg" className="p-5.5">
                <span className="flex h-11 w-11 items-center justify-center rounded-card bg-tint-accent-2 text-tint-accent-2-fg">
                  <Icon name="flashcards" size={20} />
                </span>
                <Text variant="card-title" className="mt-3 truncate">
                  {deck.name}
                </Text>
                <Text variant="meta" tone="muted" className="mt-1">
                  by {deck.author} · {deck.clones.toLocaleString()} clones
                </Text>
                <div className="mt-2">
                  <Badge tone="neutral" size="sm">
                    {deck.cardCount} cards
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  iconLeft="plus"
                  disabled={cloneDeck.isPending}
                  onClick={() =>
                    cloneDeck.mutate(deck.id, {
                      onSuccess: (copy) =>
                        navigate({
                          to: '/flashcards/$deckId',
                          params: { deckId: copy.id },
                        }),
                    })
                  }
                >
                  Clone deck
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PanelWithInvertedRadius>
  );
}
