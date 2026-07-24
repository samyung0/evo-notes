import { test, expect } from '@playwright/test';
import { chooseAllBlocksEntry } from '../helpers/editor';
import { EDITOR_NOTE, SUGGEST_NOTE } from '../../src/mocks/editorSeed';
import { openEditorNote } from './helpers';

test.describe('suggestion mode', () => {
  test('typing marks an insertion without a phantom trailing-line suggestion', async ({
    page,
  }) => {
    const editor = await openEditorNote(page, SUGGEST_NOTE.id, SUGGEST_NOTE.body);
    await expect(page.getByRole('combobox')).toContainText('Suggestion');

    await editor.getByText(SUGGEST_NOTE.body, { exact: true }).click();
    await page.keyboard.press('End');
    await page.keyboard.type(' plus addition');

    const insertion = editor.locator('ins');
    await expect(insertion).toHaveCount(1);
    await expect(insertion).toContainText('plus addition');

    // Regression: TrailingBlockPlugin's housekeeping insert used to register
    // as a block suggestion, showing a permanent "appended line" at the end.
    await expect(editor.locator('[data-block-suggestion]')).toHaveCount(0);
    await expect(editor.locator('svg.lucide-corner-down-left')).toHaveCount(0);
  });

  test('submitting a replacement produces an Add/Delete card and a clean editor', async ({
    page,
  }) => {
    const editor = await openEditorNote(page, SUGGEST_NOTE.id, SUGGEST_NOTE.body);

    // Double-click selects one word; typing over it produces a remove+insert
    // suggestion pair in a single transform.
    await editor.getByText(SUGGEST_NOTE.body, { exact: true }).dblclick();
    await page.keyboard.type('replacement');
    await expect(editor.locator('ins')).toContainText('replacement');
    await expect(editor.locator('del')).toBeVisible();

    const collaboration = page.getByRole('toolbar', { name: 'Material collaboration' });
    await collaboration.getByRole('button', { name: 'Submit suggestion' }).click();

    // Regression: the post-submit editor reset used to be recorded as a
    // whole-document suggestion; the editor must come back clean.
    await expect(editor.locator('ins')).toHaveCount(0);
    await expect(editor.locator('del')).toHaveCount(0);
    await expect(editor.getByText(SUGGEST_NOTE.body, { exact: true })).toBeVisible();

    // The suggestion card is anchored to the edited block's popover trigger.
    await page.getByRole('button', { name: 'Show 1 collaboration item' }).click();
    const card = page.getByRole('dialog').filter({ hasText: 'Comments & suggestions' });
    await expect(card).toBeVisible();
    // The card lists discrete changes (Plate demo format), not the whole file.
    await expect(card.getByText('Add', { exact: true })).toBeVisible();
    await expect(card.getByText('Delete', { exact: true })).toBeVisible();
    await expect(card.getByText('replacement')).toBeVisible();
    // Regression: the whole document used to appear as deleted + re-added.
    await expect(card.getByText(SUGGEST_NOTE.headingText)).toHaveCount(0);

    // Submitted pending changes stay visible in the document in every mode.
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('complementary', { name: 'Suggested changes' })
    ).toContainText('replacement');
    const modes = page.getByRole('combobox');
    await modes.click();
    await page.getByRole('option', { name: 'View' }).click();
    await expect(
      page.getByRole('complementary', { name: 'Suggested changes' })
    ).toContainText('replacement');
  });

  test('an editor sees submitted changes after returning to edit mode', async ({ page }) => {
    await openEditorNote(page, EDITOR_NOTE.id, EDITOR_NOTE.firstParagraph);
    const modes = page.getByRole('combobox');
    await modes.click();
    await page.getByRole('option', { name: 'Suggestion' }).click();

    const editor = page.locator('[contenteditable="true"]').first();
    await editor.getByText(EDITOR_NOTE.firstParagraph, { exact: true }).dblclick();
    await page.keyboard.type('owner replacement');
    await page
      .getByRole('toolbar', { name: 'Material collaboration' })
      .getByRole('button', { name: 'Submit suggestion' })
      .click();
    await expect(
      page.getByRole('complementary', { name: 'Suggested changes' })
    ).toContainText('owner replacement');

    await modes.click();
    await page.getByRole('option', { name: 'Edit' }).click();
    await expect(
      page.getByRole('complementary', { name: 'Suggested changes' })
    ).toContainText('owner replacement');
  });

  test('submitting a new line records it and anchors it to a surviving block', async ({ page }) => {
    const editor = await openEditorNote(page, SUGGEST_NOTE.id, SUGGEST_NOTE.body);

    await editor.getByText(SUGGEST_NOTE.body, { exact: true }).click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(editor.locator('svg.lucide-corner-down-left')).toBeVisible();

    const collaboration = page.getByRole('toolbar', { name: 'Material collaboration' });
    await collaboration.getByRole('button', { name: 'Submit suggestion' }).click();

    // The inserted empty block is removed by the reset, but its line-break
    // suggestion remains attached to the preceding base block.
    const submitted = page.getByRole('complementary', { name: 'Suggested changes' });
    await expect(submitted).toContainText('Add');
    await expect(submitted).toContainText('(line break)');
    await page.getByRole('button', { name: 'Show 1 collaboration item' }).click();
    const card = page.getByRole('dialog').filter({ hasText: 'Comments & suggestions' });
    await expect(card).toContainText('(line break)');
  });

  test('commenting on a selection shows the thread in the block popover', async ({ page }) => {
    const editor = await openEditorNote(page, SUGGEST_NOTE.id, SUGGEST_NOTE.body);

    await editor.getByText(SUGGEST_NOTE.body, { exact: true }).dblclick();
    await chooseAllBlocksEntry(page, 'Comment');
    await page.getByPlaceholder('Share feedback on the selection').fill('E2E matrix comment');
    await page.getByRole('button', { name: 'Add comment', exact: true }).click();

    // The selection is marked with the comment highlight…
    await expect(
      editor.locator('[class~="bg-tint-accent-2"][class~="underline"]').first()
    ).toBeVisible();
    // …and the thread shows in the block's collaboration popover.
    await page.getByRole('button', { name: 'Show 1 collaboration item' }).click();
    await expect(page.getByText('E2E matrix comment', { exact: true })).toBeVisible();
  });
});
