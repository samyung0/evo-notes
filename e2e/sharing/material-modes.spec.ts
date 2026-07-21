import { test, expect } from '../fixtures/actors';
import { apiEndsWith, waitForApi } from '../helpers/api';
import { openWorkspaceMaterial } from '../helpers/workspace';

test.describe('shared material modes', () => {
  test('anonymous visitors always get static view without editor controls', async ({
    anonymousPage,
    seed,
  }) => {
    for (const [workspaceId, material] of [
      [seed.linkWorkspace.id, seed.viewerNote],
      [seed.editableWorkspace.id, seed.editableNote],
    ] as const) {
      await openWorkspaceMaterial(anonymousPage, workspaceId, material.id, true);
      await expect(anonymousPage.getByText(material.body)).toBeVisible();
      await expect(anonymousPage.getByRole('toolbar', { name: 'Document formatting' })).toHaveCount(
        0
      );
      await expect(anonymousPage.getByRole('combobox')).toHaveCount(0);
      await expect(anonymousPage.locator('[contenteditable="true"]')).toHaveCount(0);
    }
  });

  test('commenters can suggest with highlighted insertions and deletions', async ({
    otherPage,
    seed,
  }) => {
    await openWorkspaceMaterial(otherPage, seed.publicWorkspace.id, seed.commenterNote.id, true);
    await expect(otherPage.getByRole('combobox')).toContainText('Suggestion');
    await expect(otherPage.getByRole('toolbar', { name: 'Document formatting' })).toBeVisible();
    await expect(otherPage.getByRole('button', { name: 'Upload image' })).toHaveCount(0);
    await expect(otherPage.getByRole('button', { name: /AI commands/ })).toHaveCount(0);

    // Double-click selects one word; typing over it produces a remove+insert
    // suggestion pair in a single transform (no cross-keystroke selection races).
    const editor = otherPage.locator('[contenteditable="true"]').first();
    await editor.getByText(seed.commenterNote.body, { exact: true }).dblclick();
    await otherPage.keyboard.type('replacement');

    const insertion = editor.locator('ins');
    const deletion = editor.locator('del');
    await expect(insertion).toContainText('replacement');
    await expect(insertion).toHaveClass(/bg-tint-accent-2/);
    await expect(deletion).toBeVisible();
    await expect(deletion).toHaveClass(/bg-tint-error/);
    await expect(otherPage.getByRole('button', { name: 'Submit suggestion' })).toBeEnabled();

    const submitted = waitForApi(
      otherPage,
      apiEndsWith(`/api/materials/${seed.commenterNote.id}/suggestions`, 'POST')
    );
    await otherPage.getByRole('button', { name: 'Submit suggestion' }).click();
    expect((await submitted).status()).toBe(201);
    await expect(otherPage.getByText(seed.commenterNote.body)).toBeVisible();
  });

  test('comments render the selected text with the configured highlight', async ({
    otherPage,
    seed,
  }) => {
    await openWorkspaceMaterial(otherPage, seed.publicWorkspace.id, seed.commenterNote.id, true);
    const editor = otherPage.locator('[contenteditable="true"]').first();
    await editor.getByText(seed.commenterNote.body, { exact: true }).dblclick();
    await otherPage
      .getByRole('toolbar', { name: 'Document formatting' })
      .getByRole('button', { name: 'Comment', exact: true })
      .click();
    await otherPage.getByPlaceholder('Share feedback on the selection').fill('E2E comment');

    const created = waitForApi(
      otherPage,
      apiEndsWith(`/api/materials/${seed.commenterNote.id}/discussions`, 'POST')
    );
    await otherPage.getByRole('button', { name: 'Add comment', exact: true }).click();
    expect((await created).status()).toBe(201);

    const highlight = editor.locator('[class~="bg-tint-accent-2"][class~="underline"]');
    await expect(highlight).toContainText('clearer');
  });

  test('shared editors can choose edit, suggestion, and static view without workspace tools', async ({
    otherPage,
    seed,
  }) => {
    await openWorkspaceMaterial(otherPage, seed.editableWorkspace.id, seed.editableNote.id, true);
    const modes = otherPage.getByRole('combobox');
    await expect(modes).toContainText('Edit');
    await expect(otherPage.getByRole('toolbar', { name: 'Document formatting' })).toBeVisible();
    await expect(otherPage.getByRole('button', { name: 'Upload image' })).toHaveCount(0);
    await expect(otherPage.getByRole('button', { name: /AI commands/ })).toHaveCount(0);

    await modes.click();
    await expect(otherPage.getByRole('option', { name: 'Edit' })).toBeVisible();
    await expect(otherPage.getByRole('option', { name: 'Suggestion' })).toBeVisible();
    await expect(otherPage.getByRole('option', { name: 'View' })).toBeVisible();
    await otherPage.getByRole('option', { name: 'View' }).click();
    await expect(otherPage.getByText(seed.editableNote.body)).toBeVisible();
    await expect(otherPage.getByRole('toolbar', { name: 'Document formatting' })).toHaveCount(0);

    await modes.click();
    await otherPage.getByRole('option', { name: 'Suggestion' }).click();
    await expect(otherPage.getByRole('button', { name: 'Submit suggestion' })).toBeDisabled();
  });

  test('accepting a suggestion updates content and status atomically', async ({
    ownerPage,
    otherApi,
    ownerApi,
    seed,
  }) => {
    const materialResponse = await otherApi.get(`/api/materials/${seed.reviewNote.id}`);
    expect(materialResponse.status()).toBe(200);
    const material = await materialResponse.json();
    const proposed = structuredClone(material.content.value);
    proposed[1].children = [
      {
        text: seed.reviewNote.body,
        suggestion: true,
        suggestion_remove: { id: 'remove-e2e', type: 'remove', userId: 'u_other' },
      },
      {
        text: 'Accepted review sentence',
        suggestion: true,
        suggestion_insert: { id: 'insert-e2e', type: 'insert', userId: 'u_other' },
      },
    ];
    const create = await otherApi.post(`/api/materials/${seed.reviewNote.id}/suggestions`, {
      data: {
        baseRevision: material.revision,
        anchor: { scope: 'document' },
        originalFragment: material.content.value,
        proposedFragment: proposed,
      },
    });
    expect(create.status()).toBe(201);
    const suggestion = await create.json();

    await openWorkspaceMaterial(ownerPage, seed.editableWorkspace.id, seed.reviewNote.id);
    await ownerPage.getByRole('button', { name: 'Threads' }).click();
    await expect(ownerPage.getByText('Accepted review sentence')).toBeVisible();
    const accepted = waitForApi(
      ownerPage,
      apiEndsWith(`/api/material-suggestions/${suggestion.id}`, 'PATCH')
    );
    await ownerPage.getByRole('button', { name: 'Accept' }).click();
    expect((await accepted).status()).toBe(200);

    const updatedMaterial = await ownerApi.get(`/api/materials/${seed.reviewNote.id}`);
    const updated = await updatedMaterial.json();
    expect(updated.revision).toBe(material.revision + 1);
    expect(JSON.stringify(updated.content)).toContain('Accepted review sentence');
    expect(JSON.stringify(updated.content)).not.toContain('Original review sentence');

    const suggestions = await ownerApi.get(`/api/materials/${seed.reviewNote.id}/suggestions`);
    const reviewed = (await suggestions.json()).find(
      (item: { id: string }) => item.id === suggestion.id
    );
    expect(reviewed.status).toBe('accepted');
  });
});
