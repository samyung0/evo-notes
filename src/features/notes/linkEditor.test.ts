import { LinkPlugin } from '@platejs/link/react';
import { KEYS } from 'platejs';
import { createPlateEditor } from 'platejs/react';
import { describe, expect, it } from 'vitest';
import { cloneLinkSelection, upsertLinkAtSelection } from './linkEditor';

describe('upsertLinkAtSelection', () => {
  it('restores the captured range before linking selected text', () => {
    const editor = createPlateEditor({
      plugins: [LinkPlugin],
      value: [{ type: KEYS.p, children: [{ text: 'Selected text' }] }],
    });
    editor.tf.select({
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 8 },
    });
    const selection = cloneLinkSelection(editor.selection);

    editor.tf.select({ path: [0, 0], offset: 13 });
    const applied = upsertLinkAtSelection(editor, selection, {
      text: 'Selected',
      url: 'https://example.com',
    });

    expect(applied).toBe(true);
    const children = (editor.children[0] as { children: Array<Record<string, unknown>> }).children;
    expect(children.find((child) => child.type === KEYS.link)).toMatchObject({
      type: KEYS.link,
      url: 'https://example.com',
      children: [{ text: 'Selected' }],
    });
    expect(children).toContainEqual({ text: ' text' });
  });
});
