import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, IconButton, Skeleton, Text } from '@/components/ui';
import { useCards, useDeck, useDeleteCard } from '@/api/hooks';
import { CardEditModal } from '@/features/flashcards/CardEditModal';
import type { Flashcard } from '@/api/types';

/** In-pane, read-only preview of a flashcard deck: lists front/back of each
 * card with a Study action that launches the full study session. */
export function DeckPreview({ deckId, readOnly = false }: { deckId: string; readOnly?: boolean }) {
  const { data: deck } = useDeck(deckId);
  const { data: cards, isLoading } = useCards(deckId);
  const deleteCard = useDeleteCard(deckId);
  const navigate = useNavigate();
  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState<Flashcard | 'new' | null>(null);

  if (isLoading || !deck) return <Skeleton className="h-full min-h-[40vh] w-full" />;

  const canEdit = !readOnly && deck.isOwner !== false;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-divider px-1 pb-3">
        <div className="flex-1">
          <Text variant="meta" tone="muted">
            {deck.cardCount} cards · {deck.knownPct}% known
          </Text>
        </div>
        {canEdit && managing && (
          <Button size="sm" variant="outline" iconLeft="plus" onClick={() => setEditing('new')}>
            Add card
          </Button>
        )}
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            iconLeft={managing ? 'check' : 'notes'}
            onClick={() => setManaging((value) => !value)}
          >
            {managing ? 'Done' : 'Edit'}
          </Button>
        )}
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
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-3 rounded-card border border-line bg-surface p-3 text-sm"
          >
            <span className="font-medium wrap-break-word text-fg">{c.front}</span>
            <span className="wrap-break-word text-fg-secondary">{c.back}</span>
            {managing ? (
              <div className="-my-1 flex items-center">
                <IconButton
                  icon="notes"
                  size="xs"
                  variant="ghost-hover"
                  label="Edit card"
                  onClick={() => setEditing(c)}
                />
                <IconButton
                  icon="trash"
                  size="xs"
                  variant="ghost-hover"
                  label="Delete card"
                  className="hover:text-tint-error-fg"
                  disabled={deleteCard.isPending}
                  onClick={() => deleteCard.mutate(c.id)}
                />
              </div>
            ) : (
              <span />
            )}
          </div>
        ))}
        {!cards?.length && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Text variant="body" tone="muted">
              This deck has no cards yet.
            </Text>
            {managing && (
              <Button size="sm" variant="outline" iconLeft="plus" onClick={() => setEditing('new')}>
                Add card
              </Button>
            )}
          </div>
        )}
      </div>
      {canEdit && (
        <CardEditModal
          deckId={deckId}
          card={editing === 'new' ? null : editing}
          open={editing !== null}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
