import { useState } from 'react';
import type { Privacy } from '@/api/types';
import { Button, Icon, type IconName, SimpleDialog, Text, toast } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

const PRIVACY_OPTIONS: { value: Privacy; label: string; icon: IconName; hint: string }[] = [
  { value: 'private', label: 'Private', icon: 'lock', hint: 'Only you can see this.' },
  {
    value: 'link',
    label: 'Shared link',
    icon: 'link',
    hint: 'Anyone with the link can view and clone it.',
  },
  {
    value: 'public',
    label: 'Public',
    icon: 'globe',
    hint: 'Anyone can discover it on the Explore page.',
  },
];

/** Generic share dialog: pick a visibility (private / link / public) and copy
 * the share link. Used by workspaces, quizzes and flashcard decks. */
export function ShareDialog({
  open,
  onClose,
  title,
  privacy,
  onPrivacyChange,
  link,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  privacy: Privacy;
  onPrivacyChange: (privacy: Privacy) => void;
  /** Absolute or app-relative URL viewers should open. */
  link: string;
  saving?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const current = PRIVACY_OPTIONS.find((o) => o.value === privacy) ?? PRIVACY_OPTIONS[0];
  const absoluteLink = link.startsWith('http') ? link : `${window.location.origin}${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(absoluteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Could not copy link',
        description: absoluteLink,
        button: { label: 'Dismiss', onClick: () => {} },
      });
    }
  }

  return (
    <SimpleDialog open={open} onClose={onClose} title={title ?? 'Share'} width={460}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Text variant="body" className="font-medium">
            Visibility
          </Text>
          <div className="max-w-70 min-w-45">
            <Select
              value={privacy}
              onValueChange={(v) => onPrivacyChange(v as Privacy)}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PRIVACY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <div className="flex items-center gap-1.5">
                        <Icon name={o.icon} className="size-4.5" />
                        <span className="translate-y-px">{o.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Text variant="meta" tone="muted">
          {current.hint}
        </Text>
        {privacy !== 'private' && (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 truncate rounded-row border border-line bg-surface-hover-bg px-2.5 py-2 text-sm text-fg-secondary">
              {absoluteLink}
            </div>
            <Button size="sm" variant="outline" onClick={copy} iconLeft={copied ? 'check' : 'link'}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        )}
      </div>
    </SimpleDialog>
  );
}
