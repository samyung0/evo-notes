import { useState } from 'react';
import type { Privacy, WorkspaceRole } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, SimpleDialog } from '@/components/ui/Dialog';
import { Icon, type IconName } from '@/components/ui/Icon';
import { userToast } from '@/components/ui/userToast';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { WorkspaceMemberManager } from './WorkspaceMemberManager';
import { InputTitle } from '../ui';

type SharedRole = Exclude<WorkspaceRole, 'owner'>;
type SavingField = 'privacy' | 'shareRole';
type PendingDangerousChange =
  { kind: 'privacy'; value: Privacy } | { kind: 'shareRole'; value: SharedRole };

const PRIVACY_OPTIONS: { value: Privacy; label: string; icon: IconName; hint: string }[] = [
  { value: 'private', label: 'Private', icon: 'lock', hint: 'Only you can access.' },
  {
    value: 'link',
    label: 'Shared link',
    icon: 'link',
    hint: 'Anyone with the link can see it.',
  },
  {
    value: 'public',
    label: 'Public',
    icon: 'globe',
    hint: 'Open to public, your workspace can be searched.',
  },
];

const SHARED_ROLE_OPTIONS: Array<{ value: SharedRole; label: string; hint: string }> = [
  { value: 'viewer', label: 'Can view', hint: "Just see, can't touch." },
  {
    value: 'commenter',
    label: 'Can comment',
    hint: 'Users can comment and suggest changes.',
  },
  {
    value: 'editor',
    label: 'Can edit',
    hint: 'Editing is allowed on the files.',
  },
];

const PUBLIC_EDITOR_WARNING =
  'Public workspaces are searchable. Combined with edit access, anyone signed in can find and change your files.';

function isPublicEditor(privacy: Privacy, shareRole: SharedRole | undefined): boolean {
  return privacy === 'public' && shareRole === 'editor';
}

function toastShareSuccess(kind: SavingField) {
  userToast({
    title: 'Sharing updated successfully',
    variant: 'success',
  });
}

function toastShareError(err: unknown, kind: SavingField) {
  userToast({
    title: kind === 'privacy' ? 'Could not update visibility' : 'Could not update permissions',
    description: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
    variant: 'error',
  });
}

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
  /** Prefer returning a Promise (e.g. mutateAsync) so success/error toasts work. */
  onPrivacyChange: (privacy: Privacy) => void | Promise<unknown>;
  /** Absolute or app-relative URL viewers should open. */
  link: string;
  saving?: boolean;
  /** Enables workspace member management and link/public material permissions. */
  workspaceId?: string;
  shareRole?: SharedRole;
  onShareRoleChange?: (role: SharedRole) => void | Promise<unknown>;
}) {
  const [copied, setCopied] = useState(false);
  const [savingField, setSavingField] = useState<SavingField | null>(null);
  const [pendingDangerous, setPendingDangerous] = useState<PendingDangerousChange | null>(null);
  const busy = Boolean(saving) || savingField !== null;
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
  const roleHint =
    privacy === 'public' && currentRole.value === 'editor'
      ? 'Anyone who finds this workspace can edit your files.'
      : currentRole.hint;
  const absoluteLink = link.startsWith('http') ? link : `${window.location.origin}${link}`;
  const publicEditorActive = isPublicEditor(privacy, shareRole);

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

  async function applyPrivacyChange(next: Privacy) {
    setSavingField('privacy');
    try {
      await onPrivacyChange(next);
      toastShareSuccess('privacy');
    } catch (err) {
      toastShareError(err, 'privacy');
    } finally {
      setSavingField(null);
    }
  }

  async function applyShareRoleChange(next: SharedRole) {
    if (!onShareRoleChange) return;
    setSavingField('shareRole');
    try {
      await onShareRoleChange(next);
      toastShareSuccess('shareRole');
    } catch (err) {
      toastShareError(err, 'shareRole');
    } finally {
      setSavingField(null);
    }
  }

  function handlePrivacyChange(next: Privacy) {
    if (next === privacy || busy) return;
    if (isPublicEditor(next, shareRole)) {
      setPendingDangerous({ kind: 'privacy', value: next });
      return;
    }
    void applyPrivacyChange(next);
  }

  function handleShareRoleChange(next: SharedRole) {
    if (!onShareRoleChange || next === shareRole || busy) return;
    if (isPublicEditor(privacy, next)) {
      setPendingDangerous({ kind: 'shareRole', value: next });
      return;
    }
    void applyShareRoleChange(next);
  }

  function confirmDangerousChange() {
    if (!pendingDangerous) return;
    const pending = pendingDangerous;
    setPendingDangerous(null);
    if (pending.kind === 'privacy') void applyPrivacyChange(pending.value);
    else void applyShareRoleChange(pending.value);
  }

  const confirmingDangerous = pendingDangerous !== null;

  return (
    <SimpleDialog
      open={open}
      onClose={() => {
        if (confirmingDangerous) return;
        onClose();
      }}
      title={title ?? 'Share'}
      onPointerDownOutside={(e) => {
        if (confirmingDangerous) e.preventDefault();
      }}
      onInteractOutside={(e) => {
        if (confirmingDangerous) e.preventDefault();
      }}
      onEscapeKeyDown={(e) => {
        if (confirmingDangerous) e.preventDefault();
      }}
    >
      <div className="flex flex-col gap-6">
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <InputTitle>Visibility</InputTitle>
            <p className="t-meta text-fg-muted">{current.hint}</p>
          </div>
          <div className="max-w-70 min-w-45">
            <Select
              value={privacy}
              onValueChange={(v) => handlePrivacyChange(v as Privacy)}
              disabled={busy}
            >
              <SelectTrigger loading={savingField === 'privacy'}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {privacyOptions.map((o) => (
                    <SelectItem
                      key={o.value}
                      value={o.value}
                      className={
                        o.value === 'public' && shareRole === 'editor'
                          ? 'text-tint-error-fg hover:bg-tint-error'
                          : undefined
                      }
                    >
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
        {workspaceId && privacy !== 'private' && shareRole && onShareRoleChange && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <InputTitle>Anyone with access</InputTitle>
              <p className="t-meta text-fg-muted">{roleHint}</p>
            </div>
            <div className="max-w-70 min-w-45">
              <Select
                value={shareRole}
                onValueChange={(value) => handleShareRoleChange(value as SharedRole)}
                disabled={busy}
              >
                <SelectTrigger loading={savingField === 'shareRole'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SHARED_ROLE_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className={
                          option.value === 'editor' && privacy === 'public'
                            ? 'text-tint-error-fg hover:bg-tint-error'
                            : undefined
                        }
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        {publicEditorActive && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-row border border-solid-error/30 bg-tint-error px-3 py-2.5 text-sm text-tint-error-fg"
          >
            <Icon name="warning" className="mt-0.5 size-4.5 shrink-0" />
            <p>{PUBLIC_EDITOR_WARNING}</p>
          </div>
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
      <ConfirmDialog
        open={confirmingDangerous}
        onClose={() => setPendingDangerous(null)}
        onConfirm={confirmDangerousChange}
        title="Allow public editing?"
        body={PUBLIC_EDITOR_WARNING}
        confirmLabel="Allow public editing"
        danger
      />
    </SimpleDialog>
  );
}
