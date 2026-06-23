import { Link } from '@tanstack/react-router';
import { Panel, PageHeader } from '@/components/app/layout';
import { Card, Icon, IconButton, ProgressBar, Spinner, Text } from '@/components/ui';
import { colorPair } from '@/lib/workspaceColor';
import { useDecks } from '@/api/hooks';
import { m } from '@/i18n';

export default function Flashcards() {
  const { data, isLoading } = useDecks();
  return (
    <Panel>
      <PageHeader
        title={m.nav_flashcards()}
        actions={<IconButton icon="plus" variant="dark" label="New deck" />}
      />
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        {isLoading ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.map((d) => {
              const c = colorPair(d.color);
              return (
                <Link
                  key={d.id}
                  to="/flashcards/$deckId"
                  params={{ deckId: d.id }}
                  preload="intent"
                >
                  <Card interactive padding={18} radius="card-lg" className="h-full">
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-card"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      <Icon name="flashcards" size={20} />
                    </span>
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
    </Panel>
  );
}
