import { useState } from 'react';
import type { WorkspaceInviteCandidate, WorkspaceRole } from '@/api/types';
import {
  useCreateWorkspaceInvite,
  useRemoveWorkspaceMember,
  useRevokeWorkspaceInvite,
  useUpdateWorkspaceMember,
  useWorkspaceInviteCandidates,
  useWorkspaceInvites,
  useWorkspaceMembers,
} from '@/api/hooks';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input, InputTitle } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useDebounced } from '@/lib/useDebounced';

type MemberRole = Exclude<WorkspaceRole, 'owner'>;

const ROLE_OPTIONS: Array<{ value: MemberRole; label: string }> = [
  { value: 'viewer', label: 'View' },
  { value: 'commenter', label: 'Comment' },
  { value: 'editor', label: 'Edit' },
];

export function WorkspaceMemberManager({ workspaceId }: { workspaceId: string }) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<MemberRole>('viewer');
  const [selected, setSelected] = useState<WorkspaceInviteCandidate | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const debouncedQuery = useDebounced(query, 300);
  const members = useWorkspaceMembers(workspaceId);
  const invites = useWorkspaceInvites(workspaceId);
  const candidates = useWorkspaceInviteCandidates(workspaceId, debouncedQuery);
  const createInvite = useCreateWorkspaceInvite(workspaceId);
  const updateMember = useUpdateWorkspaceMember(workspaceId);
  const removeMember = useRemoveWorkspaceMember(workspaceId);
  const revokeInvite = useRevokeWorkspaceInvite(workspaceId);

  async function invite() {
    if (!selected) return;
    const created = await createInvite.mutateAsync({ userId: selected.id, role });
    setSelected(null);
    setQuery('');
    if (created.token) {
      setInviteLink(`${window.location.origin}/workspace-invites/${created.token}`);
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
  }

  return (
    <section className="border-t border-divider pt-4" aria-labelledby="workspace-members-title">
      <div>
        <InputTitle id="workspace-members-title">People with access</InputTitle>
        <p className="t-meta text-fg-muted">
          Invite an existing Evo Notes user. They must accept before access is granted.
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(null);
              setInviteLink(null);
            }}
            placeholder="Search by name or email"
            leftIcon="search"
            wrapperClassName="min-w-0 flex-1"
          />
          <RoleSelect value={role} onChange={setRole} disabled={createInvite.isPending} />
        </div>

        {selected ? (
          <div className="flex items-center gap-2 rounded-row border border-line bg-surface-hover-bg p-2">
            <Avatar src={selected.avatarUrl} name={selected.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{selected.name}</p>
              <p className="truncate text-xs text-fg-muted">{selected.email}</p>
            </div>
            <Button
              size="sm"
              variant="accent"
              disabled={createInvite.isPending}
              onClick={() => void invite()}
            >
              {createInvite.isPending ? 'Inviting…' : 'Invite'}
            </Button>
          </div>
        ) : (
          debouncedQuery.trim().length >= 2 &&
          (candidates.data?.length ? (
            <div className="max-h-40 overflow-auto rounded-row border border-line p-1">
              {candidates.data.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-row px-2 py-1.5 text-left hover:bg-surface-hover-bg"
                  onClick={() => setSelected(candidate)}
                >
                  <Avatar src={candidate.avatarUrl} name={candidate.name} size="xs" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">
                      {candidate.name}
                    </span>
                    <span className="block truncate text-xs text-fg-muted">{candidate.email}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            !candidates.isFetching && (
              <p className="t-meta px-1 text-fg-muted">No eligible users found.</p>
            )
          ))
        )}

        {createInvite.isError && (
          <p role="alert" className="text-xs text-solid-error">
            The invitation could not be created.
          </p>
        )}

        {inviteLink && (
          <div className="flex items-center gap-2 rounded-row border border-line bg-surface-hover-bg p-2">
            <span className="min-w-0 flex-1 truncate text-xs text-fg-muted">{inviteLink}</span>
            <Button size="sm" variant="outline" onClick={() => void copyInviteLink()}>
              Copy invite
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        {members.data?.map((member) => (
          <div key={member.userId} className="flex items-center gap-2 py-1">
            <Avatar src={member.avatarUrl} name={member.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{member.name}</p>
              <p className="truncate text-xs text-fg-muted">{member.email}</p>
            </div>
            {member.role === 'owner' ? (
              <span className="px-2 text-xs font-medium text-fg-muted">Owner</span>
            ) : (
              <>
                <RoleSelect
                  value={member.role}
                  onChange={(nextRole) =>
                    updateMember.mutate({ userId: member.userId, role: nextRole })
                  }
                  disabled={updateMember.isPending || removeMember.isPending}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={removeMember.isPending}
                  onClick={() => removeMember.mutate(member.userId)}
                >
                  Remove
                </Button>
              </>
            )}
          </div>
        ))}

        {invites.data
          ?.filter((invite) => !invite.acceptedAt && !invite.revokedAt)
          .map((invite) => (
            <div
              key={invite.id}
              className="flex items-center gap-2 rounded-row bg-surface-hover-bg p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-fg">{invite.email}</p>
                <p className="text-xs text-fg-muted">
                  Pending · {ROLE_OPTIONS.find((option) => option.value === invite.role)?.label}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={revokeInvite.isPending}
                onClick={() => revokeInvite.mutate(invite.id)}
              >
                Revoke
              </Button>
            </div>
          ))}
      </div>
    </section>
  );
}

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: MemberRole;
  onChange: (role: MemberRole) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as MemberRole)}
      disabled={disabled}
    >
      <SelectTrigger className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
