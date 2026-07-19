import { test, expect } from '../fixtures/actors';
import { apiEndsWith, waitForApi } from '../helpers/api';

test.describe('workspace sharing', () => {
  test('owner can open and edit a private workspace', async ({ ownerPage, seed }) => {
    const resPromise = waitForApi(
      ownerPage,
      apiEndsWith(`/api/workspaces/${seed.privateWorkspace.id}`)
    );
    await ownerPage.goto(`/workspaces/${seed.privateWorkspace.id}`);
    const res = await resPromise;
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.capabilities.canEdit).toBe(true);
    expect(body.capabilities.canManageMembers).toBe(true);

    await expect(ownerPage.getByRole('heading', { name: seed.privateWorkspace.name })).toBeVisible();
    await expect(ownerPage.getByRole('button', { name: 'Share' })).toBeVisible();
    await expect(ownerPage.getByRole('button', { name: /Add file/i })).toBeVisible();
    await expect(ownerPage.getByRole('button', { name: 'Clone workspace' })).toHaveCount(0);
  });

  test('editor can edit but cannot share workspace privacy', async ({ editorPage, seed }) => {
    const resPromise = waitForApi(
      editorPage,
      apiEndsWith(`/api/workspaces/${seed.privateWorkspace.id}`)
    );
    await editorPage.goto(`/workspaces/${seed.privateWorkspace.id}`);
    const res = await resPromise;
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.capabilities.canEdit).toBe(true);
    expect(body.capabilities.canManageMembers).toBe(false);

    await expect(editorPage.getByRole('button', { name: /Add file/i })).toBeVisible();
    await expect(editorPage.getByRole('button', { name: 'Share' })).toHaveCount(0);
    await expect(editorPage.getByRole('button', { name: 'Clone workspace' })).toHaveCount(0);
  });

  test('non-member and anonymous cannot open a private workspace', async ({
    otherPage,
    anonymousPage,
    seed,
  }) => {
    for (const page of [otherPage, anonymousPage]) {
      const resPromise = waitForApi(
        page,
        apiEndsWith(`/api/workspaces/${seed.privateWorkspace.id}`)
      );
      await page.goto(`/share/workspaces/${seed.privateWorkspace.id}`);
      expect((await resPromise).status()).toBe(404);
      await expect(page.getByTestId('private-or-unavailable')).toBeVisible();
      await expect(page.getByText(seed.privateWorkspace.name)).toHaveCount(0);
      await expect(page.getByText(seed.privateWorkspace.secretTitle)).toHaveCount(0);
    }
  });

  test('owner can switch private workspace to shared link for viewers', async ({
    ownerPage,
    anonymousPage,
    otherPage,
    ownerApi,
    seed,
  }) => {
    try {
      await ownerPage.goto(`/workspaces/${seed.mutateWorkspace.id}`);
      await expect(ownerPage.getByRole('heading', { name: seed.mutateWorkspace.name })).toBeVisible();
      await ownerPage.getByRole('button', { name: 'Share' }).click();

      const patchPromise = waitForApi(
        ownerPage,
        apiEndsWith(`/api/workspaces/${seed.mutateWorkspace.id}`, 'PATCH')
      );
      await ownerPage.getByRole('combobox').click();
      await ownerPage.getByRole('option', { name: /Shared link/i }).click();
      expect((await patchPromise).status()).toBe(200);

      for (const page of [anonymousPage, otherPage]) {
        const resPromise = waitForApi(
          page,
          apiEndsWith(`/api/workspaces/${seed.mutateWorkspace.id}`)
        );
        await page.goto(`/share/workspaces/${seed.mutateWorkspace.id}`);
        const res = await resPromise;
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.capabilities.canEdit).toBe(false);
        await expect(page.getByRole('heading', { name: seed.mutateWorkspace.name })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Clone workspace' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Share' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /Add file/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /Add chapter/i })).toHaveCount(0);
        await expect(page.getByText('Chat')).toHaveCount(0);
        await expect(page.getByText('Generate')).toHaveCount(0);
      }
    } finally {
      // Always restore private so other workers/tests stay isolated.
      const restore = await ownerApi.patch(`/api/workspaces/${seed.mutateWorkspace.id}`, {
        data: { privacy: 'private' },
      });
      expect(restore.status()).toBe(200);
    }
  });

  test('public workspace is readable and listed on Explore; link/private are not', async ({
    anonymousPage,
    otherPage,
    seed,
  }) => {
    const publicRes = waitForApi(
      anonymousPage,
      apiEndsWith(`/api/workspaces/${seed.publicWorkspace.id}`)
    );
    await anonymousPage.goto(`/share/workspaces/${seed.publicWorkspace.id}`);
    expect((await publicRes).status()).toBe(200);
    await expect(
      anonymousPage.getByRole('heading', { name: seed.publicWorkspace.name })
    ).toBeVisible();

    const linkRes = waitForApi(
      anonymousPage,
      apiEndsWith(`/api/workspaces/${seed.linkWorkspace.id}`)
    );
    await anonymousPage.goto(`/share/workspaces/${seed.linkWorkspace.id}`);
    expect((await linkRes).status()).toBe(200);

    const exploreRes = waitForApi(otherPage, apiEndsWith('/api/explore/workspaces'));
    await otherPage.goto('/explore');
    expect((await exploreRes).status()).toBe(200);
    await expect(otherPage.getByText(seed.publicWorkspace.name)).toBeVisible();
    await expect(otherPage.getByText(seed.linkWorkspace.name)).toHaveCount(0);
    await expect(otherPage.getByText(seed.privateWorkspace.name)).toHaveCount(0);
  });

  test('signed-in viewer can clone a shared workspace; anonymous gets 401', async ({
    otherPage,
    anonymousPage,
    seed,
  }) => {
    const clonePromise = waitForApi(
      otherPage,
      apiEndsWith(`/api/workspaces/${seed.linkWorkspace.id}/clone`, 'POST')
    );
    await otherPage.goto(`/share/workspaces/${seed.linkWorkspace.id}`);
    await otherPage.getByRole('button', { name: 'Clone workspace' }).click();
    const cloneRes = await clonePromise;
    expect(cloneRes.status()).toBe(201);
    const cloned = await cloneRes.json();
    expect(cloned.workspace.privacy).toBe('private');
    expect(cloned.workspace.isOwner).toBe(true);

    const anonClone = waitForApi(
      anonymousPage,
      apiEndsWith(`/api/workspaces/${seed.linkWorkspace.id}/clone`, 'POST')
    );
    await anonymousPage.goto(`/share/workspaces/${seed.linkWorkspace.id}`);
    await anonymousPage.getByRole('button', { name: 'Clone workspace' }).click();
    expect((await anonClone).status()).toBe(401);
    await expect(anonymousPage.getByText('Sign in to clone')).toBeVisible();
  });

  test('non-member cannot mutate a shared workspace', async ({ otherApi, seed }) => {
    const patch = await otherApi.patch(`/api/workspaces/${seed.linkWorkspace.id}`, {
      data: { name: 'Hacked' },
    });
    expect(patch.status()).toBe(404);

    const chapter = await otherApi.post(`/api/workspaces/${seed.linkWorkspace.id}/chapters`, {
      data: { name: 'Injected' },
    });
    expect(chapter.status()).toBe(404);
  });
});
