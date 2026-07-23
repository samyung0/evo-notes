import { codeBlockToDecorations } from '@platejs/code-block';
import { CodeBlockPlugin } from '@platejs/code-block/react';
import { common, createLowlight } from 'lowlight';
import { KEYS } from 'platejs';
import { createPlateEditor } from 'platejs/react';
import { describe, expect, it } from 'vitest';
import { toggleEditorBlock } from './editorTransforms';

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
