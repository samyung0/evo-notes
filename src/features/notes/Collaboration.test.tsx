import { describe, expect, it } from 'vitest';
import { createPlateEditor } from 'platejs/react';
import { BaseSuggestionPlugin } from '@platejs/suggestion';
import { buildCollaborationPlugins } from './Collaboration';

function createSuggestingEditor() {
  return createPlateEditor({
    plugins: buildCollaborationPlugins({
      currentUserId: 'u_commenter',
      discussions: [],
      users: {},
      mode: 'suggestion',
    }),
    value: [{ type: 'p', children: [{ text: 'Original sentence' }] }],
  });
}

describe('buildCollaborationPlugins suggestion mode', () => {
  it('keeps the comment renderer and shortcut in the resolved plugin', () => {
    // Stable comment behavior must not live in Plate's single `.configure()`
    // slot, or a future runtime options configuration will replace it.
    const editor = createSuggestingEditor();
    const plugin = editor.getPlugin({ key: 'comment' }) as {
      node?: { component?: unknown };
      render?: { node?: unknown };
      shortcuts?: { setDraft?: { keys?: string } };
    };
    expect(plugin.node?.component ?? plugin.render?.node).toBeTruthy();
    expect(plugin.shortcuts?.setDraft?.keys).toBe('mod+shift+m');
  });

  it('resolves the configured author and suggesting state', () => {
    const editor = createSuggestingEditor();
    const options = editor.getOptions(BaseSuggestionPlugin);
    // Regression: a creation-time function config on the plugin used to
    // overwrite currentUserId with '', so the normalizer treated every typed
    // suggestion as authorless and deleted it immediately.
    expect(options.currentUserId).toBe('u_commenter');
    expect(options.isSuggesting).toBe(true);
  });

  it('keeps the ins/del leaf renderer alongside runtime options', () => {
    // Regression: Plate plugins hold a single `.configure()` slot, so the
    // runtime configure({ options }) used to wipe out a module-level
    // configure({ render }) and suggestions rendered as plain spans.
    const editor = createSuggestingEditor();
    const plugin = editor.getPlugin({ key: 'suggestion' }) as {
      node?: { component?: unknown };
      render?: { node?: unknown; leaf?: unknown };
    };
    expect(plugin.node?.component ?? plugin.render?.leaf ?? plugin.render?.node).toBeTruthy();
  });

  it('keeps typed text as an authored insert suggestion', () => {
    const editor = createSuggestingEditor();
    const end = { path: [0, 0], offset: 'Original sentence'.length };
    editor.tf.select({ anchor: end, focus: end });
    editor.tf.insertText(' improved');

    const leaves = (editor.children[0] as { children: Record<string, unknown>[] }).children;
    const inserted = leaves.find(
      (leaf) => typeof leaf.text === 'string' && leaf.text.includes('improved')
    );
    expect(inserted?.suggestion).toBe(true);
    const data = editor.getApi(BaseSuggestionPlugin).suggestion.dataList(inserted as never);
    expect(data.at(-1)).toMatchObject({ type: 'insert', userId: 'u_commenter' });
  });

  it('marks deleted text instead of removing it', () => {
    const editor = createSuggestingEditor();
    editor.tf.select({
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 'Original'.length },
    });
    editor.tf.deleteFragment();

    const leaves = (editor.children[0] as { children: Record<string, unknown>[] }).children;
    const removed = leaves.find((leaf) => leaf.text === 'Original');
    expect(removed?.suggestion).toBe(true);
    const data = editor.getApi(BaseSuggestionPlugin).suggestion.dataList(removed as never);
    expect(data.at(-1)).toMatchObject({ type: 'remove', userId: 'u_commenter' });
  });
});
