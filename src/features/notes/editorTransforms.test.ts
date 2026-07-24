import { codeBlockToDecorations } from '@platejs/code-block';
import { CodeBlockPlugin } from '@platejs/code-block/react';
import { common, createLowlight } from 'lowlight';
import { KEYS } from 'platejs';
import { createPlateEditor } from 'platejs/react';
import { describe, expect, it } from 'vitest';
import { clearEditorFormatting, toggleEditorBlock } from './editorTransforms';

function createCodeEditor(text = 'console.log()') {
  const lowlight = createLowlight(common);
  const editor = createPlateEditor({
    plugins: [CodeBlockPlugin.configure({ options: { lowlight } })],
    value: [{ type: KEYS.p, children: [{ text }] }],
  });
  editor.tf.select({ path: [0, 0], offset: text.length });
  toggleEditorBlock(editor, KEYS.codeBlock);
  return editor;
}

describe('toggleEditorBlock', () => {
  it('creates the nested code-line shape required by Enter', () => {
    const editor = createCodeEditor();

    editor.tf.insertBreak();

    expect(editor.children).toHaveLength(1);
    expect(editor.children[0]).toMatchObject({
      type: KEYS.codeBlock,
      children: [
        { type: KEYS.codeLine, children: [{ text: 'console.log()' }] },
        { type: KEYS.codeLine, children: [{ text: '' }] },
      ],
    });
  });

  it('keeps multiline plain-text paste inside the current code block', () => {
    const editor = createCodeEditor('');
    const data = {
      getData: (type: string) => (type === 'text/plain' ? 'first\nsecond' : ''),
    } as DataTransfer;

    editor.tf.insertData(data);

    expect(editor.children).toHaveLength(1);
    expect(editor.children[0]).toMatchObject({
      type: KEYS.codeBlock,
      children: [
        { type: KEYS.codeLine, children: [{ text: 'first' }] },
        { type: KEYS.codeLine, children: [{ text: 'second' }] },
      ],
    });
  });

  it('produces JavaScript decorations for console.log', () => {
    const editor = createCodeEditor();
    editor.tf.setNodes({ lang: 'javascript' }, { at: [0] });
    const codeBlock = editor.children[0];
    const decorations = codeBlockToDecorations(editor, [codeBlock, [0]]);
    const classNames = [...decorations.values()]
      .flat()
      .map((item) => (item as { className?: string }).className);

    expect(classNames).toContain('hljs-variable language_');
    expect(classNames).toContain('hljs-title function_');
  });
});

describe('clearEditorFormatting', () => {
  it('strips every mark from an expanded selection', () => {
    // Regression: editor.tf.removeMarks() without keys only clears pending
    // caret marks, so the toolbar's "Clear formatting" did nothing.
    const editor = createPlateEditor({
      value: [
        {
          type: KEYS.p,
          children: [
            { text: 'bold', bold: true },
            { text: ' and ', italic: true, underline: true },
            { text: 'colored', color: '#ff0000', highlight: true },
          ],
        },
      ],
    });
    editor.tf.select({
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 2], offset: 'colored'.length },
    });

    clearEditorFormatting(editor);

    const leaves = (editor.children[0] as { children: Record<string, unknown>[] }).children;
    for (const leaf of leaves) {
      expect(Object.keys(leaf)).toEqual(['text']);
    }
    expect(leaves.map((leaf) => leaf.text).join('')).toBe('bold and colored');
  });

  it('keeps marks outside the selection', () => {
    const editor = createPlateEditor({
      value: [
        {
          type: KEYS.p,
          children: [
            { text: 'keep', bold: true },
            { text: ' drop', bold: true },
          ],
        },
      ],
    });
    editor.tf.select({
      anchor: { path: [0, 0], offset: 'keep'.length },
      focus: { path: [0, 1], offset: ' drop'.length },
    });

    clearEditorFormatting(editor);

    const leaves = (editor.children[0] as { children: Record<string, unknown>[] }).children;
    expect(leaves[0]).toEqual({ text: 'keep', bold: true });
    expect(leaves[1]).toEqual({ text: ' drop' });
  });
});
