import { toggleCodeBlock } from '@platejs/code-block';
import { KEYS, type SlateEditor } from 'platejs';

/**
 * Code blocks require a nested code_line element. A generic toggleBlock call
 * only changes the current element's type and leaves its text children direct,
 * which breaks code-block keyboard, paste, and decoration behavior.
 */
export function toggleEditorBlock(editor: SlateEditor, type: string) {
  if (type === editor.getType(KEYS.codeBlock)) {
    toggleCodeBlock(editor);
    return;
  }

  editor.tf.toggleBlock(type);
}
