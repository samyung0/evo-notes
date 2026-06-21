import { useState } from 'react';
import { Modal, Button, Input, Text, SegmentedControl } from '@/components/ui';
import { cn } from '@/lib/cn';
import { WORKSPACE_COLORS, colorPair } from '@/lib/workspaceColor';
import type { Privacy, Workspace, WorkspaceColor } from '@/api/types';

export interface WorkspaceFormValues {
  name: string;
  color: WorkspaceColor;
  tags: string[];
  privacy: Privacy;
}

export function WorkspaceFormModal({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Workspace;
  onSubmit: (v: WorkspaceFormValues) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState<WorkspaceColor>(initial?.color ?? 'green');
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '');
  const [privacy, setPrivacy] = useState<Privacy>(initial?.privacy ?? 'private');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit workspace' : 'New workspace'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!name.trim()}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                color,
                tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
                privacy,
              })
            }
          >
            {initial ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">Name</Text>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workspace name" autoFocus />
        </label>

        <div className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">Color</Text>
          <div className="flex gap-2">
            {WORKSPACE_COLORS.map((c) => {
              const p = colorPair(c);
              return (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={cn('h-8 w-8 rounded-pill transition-transform', color === c && 'ring-2 ring-offset-2 ring-action ring-offset-surface')}
                  style={{ background: p.solid }}
                />
              );
            })}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">Tags</Text>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Comma separated, e.g. Cells, Genetics" />
        </label>

        <div className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">Visibility</Text>
          <SegmentedControl
            size="sm"
            options={[
              { value: 'private', label: 'Private' },
              { value: 'public', label: 'Public' },
              { value: 'link', label: 'Shared link' },
            ]}
            value={privacy}
            onChange={(v) => setPrivacy(v as Privacy)}
          />
        </div>
      </div>
    </Modal>
  );
}
