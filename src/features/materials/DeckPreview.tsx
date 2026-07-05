import { useNavigate } from '@tanstack/react-router';
import { Button, Skeleton, Text } from '@/components/ui';
import { useCards, useDeck } from '@/api/hooks';

/** In-pane, read-only preview of a flashcard deck: lists front/back of each
 * card with a Study action that launches the full study session. */
export function DeckPreview({ deckId }: { deckId: string }) {
  const { data: deck } = useDeck(deckId);
  const { data: cards, isLoading } = useCards(deckId);
  const navigate = useNavigate();

  if (isLoading || !deck) return <Skeleton className="h-full min-h-[40vh] w-full" />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-divider px-1 pb-3">
        <div className="flex-1">
          <Text variant="meta" tone="muted">
            {deck.cardCount} cards · {deck.knownPct}% known
          </Text>
        </div>
        <Button
          size="sm"
          variant="outline"
          iconLeft="notes"
          onClick={() => navigate({ to: '/flashcards/$deckId', params: { deckId } })}
        >
          Manage
        </Button>
        <Button
          size="sm"
          variant="accent"
          iconRight="arrowRight"
          onClick={() => navigate({ to: '/flashcards/$deckId', params: { deckId } })}
        >
          Study
        </Button>
      </div>

      <div className="flex flex-col gap-2 overflow-auto pt-4">
        {(cards ?? []).map((c) => (
          <div
            key={c.id}
            className="grid grid-cols-2 gap-3 rounded-card border border-line bg-surface p-3 text-sm"
          >
            <span className="font-medium text-fg">{c.front}</span>
            <span className="text-fg-secondary">{c.back}</span>
          </div>
        ))}
        {!cards?.length && (
          <Text variant="body" tone="muted" className="py-8 text-center">
            This deck has no cards yet.
          </Text>
        )}
      </div>
    </div>
  );
}
