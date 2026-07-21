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

    await expect(
      ownerPage.getByRole('heading', { name: seed.privateWorkspace.name })
    ).toBeVisible();
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
      await expect(
        ownerPage.getByRole('heading', { name: seed.mutateWorkspace.name })
      ).toBeVisible();
      await ownerPage.getByRole('button', { name: 'Share' }).click();

      const patchPromise = waitForApi(
        ownerPage,
        apiEndsWith(`/api/workspaces/${seed.mutateWorkspace.id}/sharing`, 'PATCH')
      );
      await ownerPage.getByRole('combobox').first().click();
      await ownerPage.getByRole('option', { name: /Shared link/i }).click();
      expect((await patchPromise).status()).toBe(200);
      await expect(ownerPage.getByRole('combobox').nth(1)).toContainText('Can view');

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
      const restore = await ownerApi.patch(`/api/workspaces/${seed.mutateWorkspace.id}/sharing`, {
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

  test('shared roles grant material-only writes to signed-in users', async ({ otherApi, seed }) => {
    const commenterMaterial = await otherApi.get(`/api/materials/${seed.commenterNote.id}`);
    expect(commenterMaterial.status()).toBe(200);
    const commenterBody = await commenterMaterial.json();
    expect(commenterBody.content, JSON.stringify(commenterBody)).toBeDefined();
    expect(commenterBody.capabilities).toMatchObject({
      canView: true,
      canComment: true,
      canEdit: false,
    });

    const commenterEdit = await otherApi.patch(`/api/materials/${seed.commenterNote.id}`, {
      data: {
        content: commenterBody.content,
        expectedRevision: commenterBody.revision,
      },
    });
    expect(commenterEdit.status()).toBe(403);

    const suggestion = await otherApi.post(`/api/materials/${seed.commenterNote.id}/suggestions`, {
      data: {
        baseRevision: commenterBody.revision,
        anchor: {},
        originalFragment: commenterBody.content.value,
        proposedFragment: commenterBody.content.value,
      },
    });
    expect(suggestion.status()).toBe(201);

    const editorMaterial = await otherApi.get(`/api/materials/${seed.editableNote.id}`);
    expect(editorMaterial.status()).toBe(200);
    const editorBody = await editorMaterial.json();
    expect(editorBody.capabilities).toMatchObject({
      canView: true,
      canComment: true,
      canEdit: true,
    });

    const contentEdit = await otherApi.patch(`/api/materials/${seed.editableNote.id}`, {
      data: {
        content: editorBody.content,
        expectedRevision: editorBody.revision,
      },
    });
    expect(contentEdit.status()).toBe(200);

    const metadataEdit = await otherApi.patch(`/api/materials/${seed.editableNote.id}`, {
      data: {
        title: 'Shared editor must not rename',
        expectedRevision: (await contentEdit.json()).revision,
      },
    });
    expect(metadataEdit.status()).toBe(403);

    const remove = await otherApi.delete(`/api/materials/${seed.editableNote.id}`);
    expect(remove.status()).toBe(404);
    const chapter = await otherApi.post(`/api/workspaces/${seed.editableWorkspace.id}/chapters`, {
      data: { name: 'Shared editors cannot add chapters' },
    });
    expect(chapter.status()).toBe(404);
  });
});
