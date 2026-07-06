import { useEffect, useState } from 'react';
import { Button, IconButton, Input, SimpleDialog, Text } from '@/components/ui';
import { parseFlashcardsFenceBody, type FlashcardContent } from '@/features/materials/blocks';
import { flashcardsFenceBody } from './shared';
import { uid } from '@/lib/id';

/** Small popup to author a ```flashcards block inline in a note. Emits the
 * fence body (YAML) via onSave. */
export function FlashcardsDialog({
  open,
  initialCode,
  onSave,
  onClose,
}: {
  open: boolean;
  initialCode?: string;
  onSave: (code: string) => void;
  onClose: () => void;
}) {
  const [cards, setCards] = useState<FlashcardContent[]>([]);

  useEffect(() => {
    if (!open) return;
    const parsed = initialCode ? parseFlashcardsFenceBody(initialCode).cards : [];
    setCards(parsed.length ? parsed : [{ id: uid('card'), front: '', back: '' }]);
  }, [open, initialCode]);

  function update(i: number, patch: Partial<FlashcardContent>) {
    setCards((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function add() {
    setCards((cs) => [...cs, { id: uid('card'), front: '', back: '' }]);
  }
  function remove(i: number) {
    setCards((cs) => cs.filter((_, idx) => idx !== i));
  }

  const clean = cards.filter((c) => c.front.trim() || c.back.trim());
  const canSave = clean.length > 0;

  return (
    <SimpleDialog
      open={open}
      onClose={onClose}
      title="Flashcards"
      width={620}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(flashcardsFenceBody(clean))} disabled={!canSave}>
            Insert
          </Button>
        </>
      }
    >
      <div className="flex max-h-[60vh] flex-col gap-3 overflow-auto pr-1">
        {cards.map((c, i) => (
          <div key={c.id} className="flex items-start gap-2 rounded-card border border-line p-2">
            <div className="grid flex-1 grid-cols-2 gap-2">
              <Input
                placeholder="Front"
                value={c.front}
                onChange={(e) => update(i, { front: e.target.value })}
              />
              <Input
                placeholder="Back"
                value={c.back}
                onChange={(e) => update(i, { back: e.target.value })}
              />
            </div>
            <IconButton
              icon="trash"
              variant="ghost"
              size="sm"
              label="Remove card"
              onClick={() => remove(i)}
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={add} className="self-start">
          Add card
        </Button>
        {!canSave && (
          <Text variant="meta" tone="muted">
            Add at least one card with content.
          </Text>
        )}
      </div>
    </SimpleDialog>
  );
}
