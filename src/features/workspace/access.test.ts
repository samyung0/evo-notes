import { describe, expect, it } from 'vitest';
import { canShareWorkspace, isWorkspaceReadOnly } from './access';

describe('workspace access helpers', () => {
  it('marks share viewers as read-only', () => {
    expect(
      isWorkspaceReadOnly({
        canView: true,
        canEdit: false,
        canComment: false,
        canManageMembers: false,
      })
    ).toBe(true);
  });

  it('keeps editors editable', () => {
    expect(
      isWorkspaceReadOnly({
        canView: true,
        canEdit: true,
        canComment: true,
        canManageMembers: false,
      })
    ).toBe(false);
  });

  it('allows share only for owners', () => {
    expect(
      canShareWorkspace({
        canView: true,
        canEdit: true,
        canComment: true,
        canManageMembers: true,
      })
    ).toBe(true);
    expect(
      canShareWorkspace({
        canView: true,
        canEdit: true,
        canComment: true,
        canManageMembers: false,
      })
    ).toBe(false);
  });
});
