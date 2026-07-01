import { useState } from 'react';
import { Modal, Button, Input, Text, Icon, Menu } from '@/components/ui';
import { cn } from '@/lib/cn';
import { USER_COLORS, userColorPair } from '@/lib/workspaceColor';
import type { Privacy, Workspace, UserColor } from '@/api/types';
import type { IconName } from '@/components/ui';

export interface WorkspaceFormValues {
  name: string;
  color: UserColor;
  tags: string[];
  privacy: Privacy;
}

const PRIVACY_OPTIONS: { value: Privacy; label: string; icon: IconName }[] = [
  { value: 'private', label: 'Private', icon: 'lock' },
  { value: 'public', label: 'Public', icon: 'globe' },
  { value: 'link', label: 'Shared link', icon: 'link' },
];

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
  const [color, setColor] = useState<UserColor>(initial?.color ?? 'green');
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '');
  const [privacy, setPrivacy] = useState<Privacy>(initial?.privacy ?? 'private');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit workspace' : 'New workspace'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                color,
                tags: tags
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
                privacy,
              })
            }
          >
            {initial ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">
            Name
          </Text>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">
            Tags
          </Text>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Comma separated, e.g. Cells, Genetics"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">
            Visibility
          </Text>
          <PrivacySelect value={privacy} onChange={setPrivacy} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">
            Color
          </Text>
          <div className="flex flex-wrap gap-2">
            {USER_COLORS.map((c) => {
              const p = userColorPair(c);
              const isTransparent = c === 'transparent';
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-pill transition-transform',
                    isTransparent && 'border border-line-strong text-fg-muted',
                    color === c && 'ring-2 ring-action ring-offset-2 ring-offset-surface'
                  )}
                  style={isTransparent ? undefined : { background: p.bg }}
                >
                  {isTransparent && <Icon name="x" size={15} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PrivacySelect({
  value,
  onChange,
}: {
  value: Privacy;
  onChange: (v: Privacy) => void;
}) {
  const current = PRIVACY_OPTIONS.find((o) => o.value === value) ?? PRIVACY_OPTIONS[0];
  return (
    <Menu
      align="start"
      className="w-(--radix-popover-trigger-width) min-w-52"
      trigger={
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-input border border-line bg-surface px-3.25 py-2.5 text-left hover:border-line-strong"
        >
          <span className="flex items-center gap-2">
            <Icon name={current.icon} size={16} className="text-fg-muted" />
            <span className="t-body">{current.label}</span>
          </span>
          <Icon name="chevronDown" size={16} className="text-fg-muted" />
        </button>
      }
      items={PRIVACY_OPTIONS.map((o) => ({
        label: o.label,
        icon: o.icon,
        onClick: () => onChange(o.value),
      }))}
    />
  );
}
