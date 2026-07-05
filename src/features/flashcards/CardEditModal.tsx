import { useEffect, useState } from 'react';
import { SimpleDialog, Button, Input, Text } from '@/components/ui';
import { useCreateCard, useUpdateCard } from '@/api/hooks';
import type { Flashcard } from '@/api/types';

/**
 * Create or edit a single flashcard. When `card` is provided the modal edits it,
 * otherwise it creates a new card in `deckId`.
 */
export function CardEditModal({
  deckId,
  card,
  open,
  onClose,
}: {
  deckId: string;
  card?: Flashcard | null;
  open: boolean;
  onClose: () => void;
}) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const createCard = useCreateCard(deckId);
  const updateCard = useUpdateCard(deckId);

  useEffect(() => {
    if (open) {
      setFront(card?.front ?? '');
      setBack(card?.back ?? '');
    }
  }, [open, card]);

  const canSave = front.trim().length > 0 && back.trim().length > 0;
  const pending = createCard.isPending || updateCard.isPending;

  function save() {
    if (!canSave) return;
    const done = { onSuccess: () => onClose() };
    if (card) updateCard.mutate({ id: card.id, front, back }, done);
    else createCard.mutate({ front, back }, done);
  }

  return (
    <SimpleDialog
      open={open}
      onClose={onClose}
      title={card ? 'Edit card' : 'New card'}
      width={480}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave || pending}>
            {card ? 'Save' : 'Add card'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">
            Front (term / question)
          </Text>
          <Input value={front} onChange={(e) => setFront(e.target.value)} autoFocus />
        </label>
        <label className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">
            Back (definition / answer)
          </Text>
          <Input value={back} onChange={(e) => setBack(e.target.value)} />
        </label>
      </div>
    </SimpleDialog>
  );
}
