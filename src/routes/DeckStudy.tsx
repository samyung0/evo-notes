import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Panel } from '@/components/app/layout';
import { Button, Icon, ProgressBar, Spinner, Text } from '@/components/ui';
import { useCards, useDeck, useUpdateCard } from '@/api/hooks';

export default function DeckStudy() {
  const params = useParams({ strict: false });
  const deckId = (params as { deckId: string }).deckId;
  const { data: deck } = useDeck(deckId);
  const { data: cards, isLoading } = useCards(deckId);
  const updateCard = useUpdateCard(deckId);

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (isLoading || !cards) return <Panel><div className="grid h-full place-items-center"><Spinner /></div></Panel>;
  if (!cards.length) return <Panel><div className="grid h-full place-items-center"><Text variant="body" tone="muted">This deck has no cards yet.</Text></div></Panel>;

  const card = cards[idx];
  function next(known: boolean) {
    updateCard.mutate({ id: card.id, known });
    setFlipped(false);
    setIdx((i) => (i + 1) % cards!.length);
  }

  return (
    <Panel>
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-6 py-6">
        <div className="mb-4 flex items-center gap-3">
          <Link to="/flashcards" preload="intent" className="text-fg-muted hover:text-fg"><Icon name="chevronLeft" size={20} /></Link>
          <Text variant="subtitle" className="flex-1">{deck?.name}</Text>
          <Text variant="meta" tone="muted">{idx + 1} / {cards.length}</Text>
        </div>
        <div className="mb-4"><ProgressBar value={((idx + 1) / cards.length) * 100} tone="purple" /></div>

        <button
          onClick={() => setFlipped((f) => !f)}
          className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-card-lg border border-line bg-surface p-8 text-center shadow-card transition-transform active:scale-[0.99]"
        >
          <Text variant="label" tone="muted">{flipped ? 'Answer' : 'Term'}</Text>
          <Text variant="section" className="mt-3">{flipped ? card.back : card.front}</Text>
          <Text variant="meta" tone="muted" className="mt-6 flex items-center gap-1"><Icon name="message" size={13} /> Tap to flip</Text>
        </button>

        <div className="mt-5 flex gap-3">
          <Button variant="outline" fullWidth onClick={() => next(false)} iconLeft="x">Still learning</Button>
          <Button variant="accent" fullWidth onClick={() => next(true)} iconLeft="check">Know it</Button>
        </div>
      </div>
    </Panel>
  );
}
