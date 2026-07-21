import { useState } from 'react';
import type { Privacy, WorkspaceRole } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { SimpleDialog } from '@/components/ui/Dialog';
import { Icon, type IconName } from '@/components/ui/Icon';
import { userToast } from '@/components/ui/Sonner';
import { Text } from '@/components/ui/Text';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { WorkspaceMemberManager } from './WorkspaceMemberManager';

type SharedRole = Exclude<WorkspaceRole, 'owner'>;

const PRIVACY_OPTIONS: { value: Privacy; label: string; icon: IconName; hint: string }[] = [
  { value: 'private', label: 'Private', icon: 'lock', hint: 'Only you can access this.' },
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

const SHARED_ROLE_OPTIONS: Array<{ value: SharedRole; label: string; hint: string }> = [
  { value: 'viewer', label: 'Can view', hint: 'People can read and study materials.' },
  {
    value: 'commenter',
    label: 'Can comment',
    hint: 'Signed-in people can comment and suggest changes.',
  },
  {
    value: 'editor',
    label: 'Can edit',
    hint: 'Signed-in people can edit material content and suggest changes.',
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
  workspaceId,
  shareRole,
  onShareRoleChange,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  privacy: Privacy;
  onPrivacyChange: (privacy: Privacy) => void;
  /** Absolute or app-relative URL viewers should open. */
  link: string;
  saving?: boolean;
  /** Enables workspace member management and link/public material permissions. */
  workspaceId?: string;
  shareRole?: SharedRole;
  onShareRoleChange?: (role: SharedRole) => void;
}) {
  const [copied, setCopied] = useState(false);
  const privacyOptions = workspaceId
    ? PRIVACY_OPTIONS.map((option) =>
        option.value === 'private'
          ? {
              ...option,
              label: 'Invite only',
              hint: 'Only you and accepted workspace members can access this.',
            }
          : option
      )
    : PRIVACY_OPTIONS;
  const current = privacyOptions.find((o) => o.value === privacy) ?? privacyOptions[0];
  const currentRole =
    SHARED_ROLE_OPTIONS.find((option) => option.value === shareRole) ?? SHARED_ROLE_OPTIONS[0];
  const absoluteLink = link.startsWith('http') ? link : `${window.location.origin}${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(absoluteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      userToast({
        title: 'Could not copy link',
        description: absoluteLink,
        button: { label: 'Dismiss', onClick: () => {} },
      });
    }
  }

  return (
    <SimpleDialog open={open} onClose={onClose} title={title ?? 'Share'}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p>Visibility</p>
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
                  {privacyOptions.map((o) => (
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
        {workspaceId && privacy !== 'private' && shareRole && onShareRoleChange && (
          <>
            <div className="flex items-center justify-between gap-3">
              <p>Anyone with access</p>
              <div className="max-w-70 min-w-45">
                <Select
                  value={shareRole}
                  onValueChange={(value) => onShareRoleChange(value as SharedRole)}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {SHARED_ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Text variant="meta" tone="muted">
              {currentRole.hint}
            </Text>
          </>
        )}
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
        {workspaceId && open && <WorkspaceMemberManager workspaceId={workspaceId} />}
      </div>
    </SimpleDialog>
  );
}
