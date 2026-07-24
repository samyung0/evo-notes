import { test, expect } from '../fixtures/actors';
import { apiEndsWith, waitForApi } from '../helpers/api';
import { chooseAllBlocksEntry, openAllBlocks } from '../helpers/editor';
import { openWorkspaceMaterial } from '../helpers/workspace';

test.describe('shared material modes', () => {
  test('quiz and flashcard materials use view mode actions in the main header', async ({
    ownerPage,
    seed,
  }) => {
    await openWorkspaceMaterial(ownerPage, seed.privateWorkspace.id, seed.privateQuiz.id);

    const quizActions = ownerPage.getByRole('toolbar', { name: 'Quiz actions' });
    await expect(quizActions).toContainText('1 question · Time limit: 15 min');
    await expect(quizActions.getByRole('button', { name: 'Start quiz' })).toBeVisible();

    const quizModes = ownerPage.getByRole('combobox');
    await quizModes.click();
    await expect(ownerPage.getByRole('option', { name: 'View' })).toBeVisible();
    await expect(ownerPage.getByRole('option', { name: 'Study' })).toHaveCount(0);
    await ownerPage.keyboard.press('Escape');

    await openWorkspaceMaterial(ownerPage, seed.privateWorkspace.id, seed.privateDeck.id);

    const flashcardActions = ownerPage.getByRole('toolbar', { name: 'Flashcard actions' });
    await expect(flashcardActions).toContainText('1 card · 0% known');
    await expect(flashcardActions.getByRole('button', { name: 'Study' })).toBeVisible();

    const flashcardModes = ownerPage.getByRole('combobox');
    await flashcardModes.click();
    await expect(ownerPage.getByRole('option', { name: 'View' })).toBeVisible();
    await expect(ownerPage.getByRole('option', { name: 'Study' })).toHaveCount(0);
  });

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
    const collaboration = otherPage.getByRole('toolbar', { name: 'Material collaboration' });
    await expect(collaboration.getByRole('button', { name: 'Submit suggestion' })).toBeEnabled();

    const submitted = waitForApi(
      otherPage,
      apiEndsWith(`/api/materials/${seed.commenterNote.id}/suggestions`, 'POST')
    );
    await collaboration.getByRole('button', { name: 'Submit suggestion' }).click();
    expect((await submitted).status()).toBe(201);
    await expect(otherPage.getByText(seed.commenterNote.body)).toBeVisible();
    await expect(
      otherPage.getByRole('complementary', { name: 'Suggested changes' })
    ).toContainText('replacement');

    const modes = otherPage.getByRole('combobox');
    await modes.click();
    await otherPage.getByRole('option', { name: 'View' }).click();
    await expect(
      otherPage.getByRole('complementary', { name: 'Suggested changes' })
    ).toContainText('replacement');
  });

  test('comments render the selected text with the configured highlight', async ({
    otherPage,
    seed,
  }) => {
    await openWorkspaceMaterial(otherPage, seed.publicWorkspace.id, seed.commenterNote.id, true);
    const editor = otherPage.locator('[contenteditable="true"]').first();
    await editor.getByText(seed.commenterNote.body, { exact: true }).dblclick();
    await chooseAllBlocksEntry(otherPage, 'Comment');
    await otherPage.getByPlaceholder('Share feedback on the selection').fill('E2E comment');

    const created = waitForApi(
      otherPage,
      apiEndsWith(`/api/materials/${seed.commenterNote.id}/discussions`, 'POST')
    );
    await otherPage.getByRole('button', { name: 'Add comment', exact: true }).click();
    expect((await created).status()).toBe(201);

    const highlight = editor.locator('[class~="bg-tint-accent-2"][class~="underline"]');
    await expect(highlight).toContainText('clearer');
    await otherPage.getByRole('button', { name: 'Show 1 collaboration item' }).click();
    const popover = otherPage.getByRole('dialog').filter({ hasText: 'Comments & suggestions' });
    await expect(popover.getByText('E2E comment', { exact: true })).toBeVisible();
  });

  test('all blocks exposes grouped core insertion commands', async ({ ownerPage, seed }) => {
    await openWorkspaceMaterial(ownerPage, seed.editableWorkspace.id, seed.editableNote.id);
    const menu = await openAllBlocks(ownerPage);

    for (const heading of ['Basic blocks', 'Lists', 'Media', 'Advanced blocks', 'Inline']) {
      await expect(menu.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    }
    await expect(menu.getByRole('button', { name: 'Heading 4', exact: true })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Heading 5', exact: true })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Heading 6', exact: true })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Bulleted list', exact: true })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Numbered list', exact: true })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Task list', exact: true })).toBeVisible();
    await expect(
      menu.getByRole('button', { name: 'Three equal columns', exact: true })
    ).toBeVisible();
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
    const collaboration = otherPage.getByRole('toolbar', { name: 'Material collaboration' });
    await expect(collaboration.getByRole('button', { name: 'Submit suggestion' })).toBeDisabled();
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
    // The anchor needs a selection path (or blockId): suggestion cards attach
    // to the top-level block resolved from the anchor, and an anchor with
    // neither has no UI surface in the per-block popover model.
    const create = await otherApi.post(`/api/materials/${seed.reviewNote.id}/suggestions`, {
      data: {
        baseRevision: material.revision,
        anchor: { scope: 'document', selection: { focus: { path: [1, 0], offset: 0 } } },
        originalFragment: material.content.value,
        proposedFragment: proposed,
      },
    });
    expect(create.status()).toBe(201);
    const suggestion = await create.json();

    await openWorkspaceMaterial(ownerPage, seed.editableWorkspace.id, seed.reviewNote.id);
    await ownerPage.getByRole('button', { name: 'Show 1 collaboration item' }).click();
    const popover = ownerPage.getByRole('dialog').filter({ hasText: 'Comments & suggestions' });
    await expect(popover.getByText('Accepted review sentence')).toBeVisible();
    const accepted = waitForApi(
      ownerPage,
      apiEndsWith(`/api/material-suggestions/${suggestion.id}`, 'PATCH')
    );
    await popover.getByRole('button', { name: 'Accept' }).click();
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
