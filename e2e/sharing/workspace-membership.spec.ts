import { test, expect } from '../fixtures/actors';
import { apiEndsWith, waitForApi } from '../helpers/api';

test.describe('workspace invitations', () => {
  test('owner invites a specific user and only that user can accept', async ({
    ownerPage,
    commenterPage,
    ownerApi,
    otherApi,
    viewerApi,
    seed,
  }) => {
    await ownerPage.goto(`/workspaces/${seed.inviteWorkspace.id}`);
    await ownerPage.getByRole('button', { name: 'Share' }).click();
    await expect(ownerPage.getByRole('combobox').first()).toContainText('Invite only');

    await ownerPage.getByPlaceholder('Search by name or email').fill('E2E Commenter');
    await ownerPage.getByRole('button', { name: /E2E Commenter/ }).click();
    await ownerPage.getByRole('combobox').nth(1).click();
    await ownerPage.getByRole('option', { name: 'Comment' }).click();

    const createResponse = waitForApi(
      ownerPage,
      apiEndsWith(`/api/workspaces/${seed.inviteWorkspace.id}/invites`, 'POST')
    );
    await ownerPage.getByRole('button', { name: 'Invite', exact: true }).click();
    const created = await createResponse;
    expect(created.status()).toBe(201);
    const invite = await created.json();
    expect(invite.invitedUserId).toBe('u_commenter');
    expect(invite.token).toBeTruthy();

    const wrongAccount = await otherApi.post(`/api/workspace-invites/${invite.token}/accept`);
    expect(wrongAccount.status()).toBe(403);

    const acceptResponse = waitForApi(
      commenterPage,
      apiEndsWith(`/api/workspace-invites/${invite.token}/accept`, 'POST')
    );
    await commenterPage.goto(`/workspace-invites/${invite.token}`);
    await commenterPage.getByRole('button', { name: 'Accept invitation' }).click();
    expect((await acceptResponse).status()).toBe(200);
    await commenterPage.getByRole('button', { name: 'Open workspace' }).click();
    await expect(
      commenterPage.getByRole('heading', { name: seed.inviteWorkspace.name })
    ).toBeVisible();

    const viewerInvite = await ownerApi.post(`/api/workspaces/${seed.inviteWorkspace.id}/invites`, {
      data: { userId: 'u_viewer', role: 'viewer' },
    });
    expect(viewerInvite.status()).toBe(201);
    const pending = await viewerInvite.json();
    const revoked = await ownerApi.delete(
      `/api/workspaces/${seed.inviteWorkspace.id}/invites/${pending.id}`
    );
    expect(revoked.status()).toBe(204);
    const revokedAccept = await viewerApi.post(`/api/workspace-invites/${pending.token}/accept`);
    expect(revokedAccept.status()).toBe(404);
  });
});
