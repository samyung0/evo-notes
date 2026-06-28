import { useState } from 'react';
import { Button, Input, Modal, Text } from '@/components/ui';
import { cn } from '@/lib/cn';
import { USER_COLORS, userColorPair } from '@/lib/workspaceColor';
import type { Label, UserColor } from '@/api/types';
import { m } from '@/i18n';

export interface LabelFormValues {
  name: string;
  color: UserColor;
}

export function LabelEditModal({
  label,
  open,
  onClose,
  onSave,
}: {
  label: Label;
  open: boolean;
  onClose: () => void;
  onSave: (patch: LabelFormValues) => void;
}) {
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState<UserColor>(label.color);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={m.action_edit()}
      width={440}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              onSave({ name: name.trim(), color });
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">
            Name
          </Text>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>

        <div className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">
            Color
          </Text>
          <div className="flex gap-2">
            {USER_COLORS.map((c) => {
              const p = userColorPair(c);
              return (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={cn(
                    'h-8 w-8 rounded-pill transition-transform',
                    color === c && 'ring-2 ring-action ring-offset-2 ring-offset-surface'
                  )}
                  style={{ background: p.bg }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
