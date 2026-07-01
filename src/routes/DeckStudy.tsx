import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { PanelWithInvertedRadius } from '@/components/app/layout';
import { Badge, Button, Icon, IconButton, ProgressBar, Skeleton, Text } from '@/components/ui';
import { useCards, useDeck, useDeleteCard, useReviewCard } from '@/api/hooks';
import { CardEditModal } from '@/features/flashcards/CardEditModal';
import { isDue, isKnown, ratingPreviews, reviewSrs, SRS_RATINGS, type SrsRating } from '@/lib/srs';
import { cn } from '@/lib/cn';
import type { Flashcard } from '@/api/types';
import { m } from '@/i18n';

const RATING_LABEL: Record<SrsRating, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
};
const RATING_STYLE: Record<SrsRating, string> = {
  again: 'border-tint-error text-tint-error-fg hover:bg-tint-error',
  hard: 'border-tint-warning text-tint-warning-fg hover:bg-tint-warning',
  good: 'border-tint-accent-1 text-tint-accent-1-fg hover:bg-tint-accent-1',
  easy: 'border-tint-success text-tint-success-fg hover:bg-tint-success',
};

export default function DeckStudy() {
  const params = useParams({ strict: false });
  const deckId = (params as { deckId: string }).deckId;
  const { data: deck } = useDeck(deckId);
  const { data: cards, isLoading } = useCards(deckId);
  const reviewCard = useReviewCard(deckId);
  const deleteCard = useDeleteCard(deckId);

  const [queue, setQueue] = useState<string[] | null>(null);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [editing, setEditing] = useState<Flashcard | 'new' | null>(null);

  const dueIds = useMemo(
    () => (cards ? cards.filter((c) => isDue(c.srs)).map((c) => c.id) : []),
    [cards]
  );

  // Seed the session queue once, from the currently-due cards.
  useEffect(() => {
    if (cards && queue === null) {
      setQueue(dueIds);
      setSessionTotal(dueIds.length);
    }
  }, [cards, queue, dueIds]);

  function startSession(ids: string[]) {
    setQueue(ids);
    setSessionTotal(ids.length);
    setFlipped(false);
  }

  if (isLoading || !cards || queue === null) {
    return (
      <PanelWithInvertedRadius>
        <div className="h-full p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </PanelWithInvertedRadius>
    );
  }

  const card = cards.find((c) => c.id === queue[0]);

  function rate(rating: SrsRating) {
    if (!card) return;
    const srs = reviewSrs(card.srs, rating);
    reviewCard.mutate({ id: card.id, srs, known: isKnown(srs) });
    setFlipped(false);
    setQueue((q) => {
      if (!q) return q;
      const [head, ...rest] = q;
      // "Again" cycles the card back to the end of this session.
      return rating === 'again' ? [...rest, head] : rest;
    });
  }

  function removeCurrent() {
    if (!card) return;
    deleteCard.mutate(card.id);
    setFlipped(false);
    setQueue((q) => (q ? q.filter((id) => id !== card.id) : q));
  }

  const header = (
    <div className="mb-4 flex items-center gap-3">
      <Link to="/flashcards" preload="intent" className="text-fg-muted hover:text-fg">
        <Icon name="chevronLeft" size={20} />
      </Link>
      <Text variant="subtitle" className="flex-1 truncate">
        {deck?.name}
      </Text>
      <IconButton
        icon="plus"
        variant="outline"
        size="sm"
        label={m.flashcards_add_card()}
        onClick={() => setEditing('new')}
      />
    </div>
  );

  // Nothing left in the session (or an empty/new deck).
  if (!card) {
    const notDue = cards.length - dueIds.length;
    return (
      <PanelWithInvertedRadius>
        <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-6 py-6">
          {header}
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-card-lg bg-tint-success text-tint-success-fg">
              <Icon name="check" size={30} />
            </span>
            <Text variant="section">
              {cards.length === 0 ? m.flashcards_empty_deck() : m.flashcards_all_caught_up()}
            </Text>
            {cards.length > 0 && (
              <Text variant="body" tone="muted">
                {m.flashcards_scheduled_hint({ count: notDue })}
              </Text>
            )}
            <div className="mt-2 flex gap-3">
              <Button variant="outline" iconLeft="plus" onClick={() => setEditing('new')}>
                {m.flashcards_add_card()}
              </Button>
              {cards.length > 0 && (
                <Button
                  variant="accent"
                  iconLeft="flashcards"
                  onClick={() => startSession(cards.map((c) => c.id))}
                >
                  {m.flashcards_study_all()}
                </Button>
              )}
            </div>
          </div>
        </div>
        <CardEditModal
          deckId={deckId}
          card={null}
          open={editing !== null}
          onClose={() => setEditing(null)}
        />
      </PanelWithInvertedRadius>
    );
  }

  const done = sessionTotal - queue.length;
  const previews = ratingPreviews(card.srs);

  return (
    <PanelWithInvertedRadius>
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-6 py-6">
        {header}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar value={(done / Math.max(1, sessionTotal)) * 100} tone="purple" />
          </div>
          <Badge tone="neutral" size="sm">
            {queue.length} {m.flashcards_left()}
          </Badge>
        </div>

        <button
          onClick={() => setFlipped((f) => !f)}
          className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-card-lg border border-line bg-surface p-8 text-center shadow-card transition-transform active:scale-[0.99]"
        >
          <Text variant="label" tone="muted">
            {flipped ? m.flashcards_answer() : m.flashcards_term()}
          </Text>
          <Text variant="section" className="mt-3">
            {flipped ? card.back : card.front}
          </Text>
          <Text variant="meta" tone="muted" className="mt-6 flex items-center gap-1">
            <Icon name="message" size={13} /> {m.flashcards_tap_flip()}
          </Text>
        </button>

        <div className="mt-3 flex items-center justify-center gap-4">
          <button
            onClick={() => setEditing(card)}
            className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
          >
            <Icon name="notes" size={13} /> {m.action_edit()}
          </button>
          <button
            onClick={removeCurrent}
            className="flex items-center gap-1 text-xs text-fg-muted hover:text-tint-error-fg"
          >
            <Icon name="trash" size={13} /> {m.action_delete()}
          </button>
        </div>

        {!flipped ? (
          <div className="mt-3">
            <Button variant="primary" fullWidth onClick={() => setFlipped(true)}>
              {m.flashcards_show_answer()}
            </Button>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {SRS_RATINGS.map((r) => (
              <button
                key={r}
                onClick={() => rate(r)}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-card border px-2 py-2.5 text-sm font-semibold transition-colors',
                  RATING_STYLE[r]
                )}
              >
                {RATING_LABEL[r]}
                <span className="text-[11px] font-normal opacity-70 tabular-nums">
                  {previews[r]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <CardEditModal
        deckId={deckId}
        card={editing === 'new' ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </PanelWithInvertedRadius>
  );
}
