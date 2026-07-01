import { Link, useNavigate } from '@tanstack/react-router';
import { Panel, PageHeader, PanelWithInvertedRadius } from '@/components/app/layout';
import { Badge, Card, Icon, IconButton, ProgressBar, SkeletonCardGrid, Text } from '@/components/ui';
import { userColorPair } from '@/lib/workspaceColor';
import { useCreateDeck, useDecks } from '@/api/hooks';
import { m } from '@/i18n';

export default function Flashcards() {
  const { data, isLoading } = useDecks();
  const createDeck = useCreateDeck();
  const navigate = useNavigate();

  function newDeck() {
    createDeck.mutate(
      { name: 'New deck', color: 'purple' },
      { onSuccess: (deck) => navigate({ to: '/flashcards/$deckId', params: { deckId: deck.id } }) }
    );
  }

  return (
    <PanelWithInvertedRadius>
      <PageHeader
        title={m.nav_flashcards()}
        actions={
          <IconButton
            icon="plus"
            variant="dark"
            label={m.flashcards_new_deck()}
            onClick={newDeck}
            disabled={createDeck.isPending}
          />
        }
      />
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        {isLoading ? (
          <SkeletonCardGrid count={6} cardHeight={190} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.map((d) => {
              const c = userColorPair(d.color);
              return (
                <Link
                  key={d.id}
                  to="/flashcards/$deckId"
                  params={{ deckId: d.id }}
                  preload="intent"
                >
                  <Card interactive radius="card-lg" className="h-full p-5.5">
                    <div className="flex items-start justify-between">
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-card"
                        style={{ background: c.bg, color: c.fg }}
                      >
                        <Icon name="flashcards" size={20} />
                      </span>
                      {d.dueCount > 0 && (
                        <Badge tone="accent-1" size="sm">
                          {m.flashcards_due_count({ count: d.dueCount })}
                        </Badge>
                      )}
                    </div>
                    <Text variant="card-title" className="mt-3 truncate">
                      {d.name}
                    </Text>
                    <Text variant="meta" tone="muted" className="mt-0.5">
                      {d.workspaceName}
                    </Text>
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs text-fg-muted">
                        <span>{d.cardCount} cards</span>
                        <span>{d.knownPct}% known</span>
                      </div>
                      <ProgressBar value={d.knownPct} tone="green" height={5} />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PanelWithInvertedRadius>
  );
}
