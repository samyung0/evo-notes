import { useState } from 'react';
import type { WorkspaceRole } from '@/api/types';
import {
  useCreateWorkspaceInvite,
  useRemoveWorkspaceMember,
  useUpdateWorkspaceMember,
  useWorkspaceMembers,
} from '@/api/hooks';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input, InputTitle } from '@/components/ui/Input';
import { userToast } from '@/components/ui/Sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

type MemberRole = Exclude<WorkspaceRole, 'owner'>;

const ROLE_OPTIONS: Array<{ value: MemberRole; label: string }> = [
  { value: 'viewer', label: 'View' },
  { value: 'commenter', label: 'Comment' },
  { value: 'editor', label: 'Edit' },
];

export function WorkspaceMemberManager({ workspaceId }: { workspaceId: string }) {
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<MemberRole>('viewer');
  const members = useWorkspaceMembers(workspaceId);
  const createInvite = useCreateWorkspaceInvite(workspaceId);
  const updateMember = useUpdateWorkspaceMember(workspaceId);
  const removeMember = useRemoveWorkspaceMember(workspaceId);

  async function invite() {
    const value = identifier.trim();
    if (!value) return;
    try {
      await createInvite.mutateAsync({ identifier: value, role });
      setIdentifier('');
      userToast({
        title: 'Invitation submitted',
        description: 'If an account matches, they’ll receive an invitation.',
        button: { label: 'Dismiss', onClick: () => {} },
      });
    } catch {
      userToast({
        title: 'Could not send invitation',
        description: 'Something went wrong. Please try again.',
        button: { label: 'Dismiss', onClick: () => {} },
      });
    }
  }

  return (
    <section className="border-t border-divider pt-4" aria-labelledby="workspace-members-title">
      <div>
        <InputTitle id="workspace-members-title">People with access</InputTitle>
        <p className="t-meta text-fg-muted">
          Invite by exact email or user ID. They must accept before access is granted.
        </p>
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void invite();
          }}
          placeholder="Email or user ID"
          wrapperClassName="min-w-0 flex-1"
          disabled={createInvite.isPending}
        />
        <RoleSelect value={role} onChange={setRole} disabled={createInvite.isPending} />
        <Button
          size="sm"
          variant="accent"
          disabled={createInvite.isPending || !identifier.trim()}
          onClick={() => void invite()}
        >
          {createInvite.isPending ? 'Inviting…' : 'Invite'}
        </Button>
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
