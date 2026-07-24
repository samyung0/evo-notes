import { describe, expect, it } from 'vitest';
import { createPlateEditor } from 'platejs/react';
import { BaseSuggestionPlugin } from '@platejs/suggestion';
import {
  buildCollaborationPlugins,
  suggestionSafeTrailingBlockPlugin,
} from './collaborationPlugins';

function createSuggestingEditor(value?: Array<{ type: string; children: Array<{ text: string }> }>) {
  return createPlateEditor({
    plugins: buildCollaborationPlugins({
      currentUserId: 'u_commenter',
      discussions: [],
      users: {},
      mode: 'suggestion',
    }),
    value: value ?? [{ type: 'p', children: [{ text: 'Original sentence' }] }],
  });
}

describe('buildCollaborationPlugins suggestion mode', () => {
  it('keeps the block discussion button renderer alongside runtime options', () => {
    const editor = createSuggestingEditor();
    const plugin = editor.getPlugin({ key: 'evo-discussions' }) as {
      node?: { aboveComponent?: unknown };
      render?: { aboveNodes?: unknown };
    };

    expect(plugin.node?.aboveComponent ?? plugin.render?.aboveNodes).toBeTruthy();
  });

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

  it('does not mark a value reset as a whole-document suggestion', () => {
    // Regression: replacing the document (draft restore, remote refresh) while
    // isSuggesting was on recorded "delete everything + re-insert everything".
    const editor = createSuggestingEditor();
    editor.getApi(BaseSuggestionPlugin).suggestion.withoutSuggestions(() => {
      editor.tf.setValue([{ type: 'p', children: [{ text: 'Fresh content' }] }]);
    });

    const collectMarked = (nodes: unknown[]): unknown[] =>
      nodes.flatMap((node) => {
        if (!node || typeof node !== 'object') return [];
        const record = node as Record<string, unknown>;
        const own =
          record.suggestion || Object.keys(record).some((key) => key.startsWith('suggestion_'))
            ? [record]
            : [];
        return Array.isArray(record.children) ? [...own, ...collectMarked(record.children)] : own;
      });

    expect(collectMarked(editor.children)).toEqual([]);
  });
});

describe('suggestionSafeTrailingBlockPlugin', () => {
  it('does not mark the auto-appended trailing paragraph as a suggestion', () => {
    // Regression: every suggestion-mode edit appeared to append a phantom
    // final line because TrailingBlockPlugin's insert ran as a user edit.
    const editor = createPlateEditor({
      plugins: [
        ...buildCollaborationPlugins({
          currentUserId: 'u_commenter',
          discussions: [],
          users: {},
          mode: 'suggestion',
        }),
        suggestionSafeTrailingBlockPlugin,
      ],
      // A trailing non-paragraph block forces the plugin to append one.
      value: [{ type: 'h1', children: [{ text: 'Title' }] }],
    });

    editor.tf.normalize({ force: true });

    const last = editor.children.at(-1) as Record<string, unknown>;
    expect(last.type).toBe('p');
    expect(last.suggestion).toBeUndefined();
    expect(Object.keys(last).some((key) => key.startsWith('suggestion_'))).toBe(false);
    const leaf = (last.children as Record<string, unknown>[])[0];
    expect(leaf.suggestion).toBeUndefined();
  });
});
