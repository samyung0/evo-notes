import { ListStyleType, toggleList } from '@platejs/list';
import { KEYS } from 'platejs';
import type { WidgetGroupId } from './noteEditorPrefs';
import type { NoteBlockDialogsApi } from './blocks/dialogContext';
import { customBlockNode } from './blocks/shared';
import { insertMediaPlaceholder } from './MediaNodes';

// Plate's transform extensions are plugin-derived and intentionally wider than
// the base editor type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NoteEditorInstance = any;

export interface EditorCommand {
  id: string;
  label: string;
  description: string;
  keywords?: string[];
  widget?: WidgetGroupId;
  run: (editor: NoteEditorInstance, dialogs?: NoteBlockDialogsApi | null) => void;
}

export function emptyParagraph() {
  return { type: 'p', children: [{ text: '' }] };
}

export function insertEditorNode(editor: NoteEditorInstance, node: unknown) {
  editor.tf.focus();
  editor.tf.insertNodes(node, { select: true });
}

function blockCommand(id: string, label: string, type: string, keywords: string[] = []) {
  return {
    id,
    label,
    description: `Turn the current block into ${label.toLowerCase()}`,
    keywords,
    run: (editor: NoteEditorInstance) => {
      editor.tf.focus();
      editor.tf.toggleBlock(type);
    },
  } satisfies EditorCommand;
}

export const EDITOR_COMMANDS: EditorCommand[] = [
  blockCommand('paragraph', 'Text', 'p', ['paragraph', 'plain']),
  blockCommand('heading-1', 'Heading 1', 'h1', ['title', 'h1']),
  blockCommand('heading-2', 'Heading 2', 'h2', ['subtitle', 'h2']),
  blockCommand('heading-3', 'Heading 3', 'h3', ['section', 'h3']),
  {
    id: 'bulleted-list',
    label: 'Bulleted list',
    description: 'Create an indented bullet list',
    keywords: ['unordered', 'ul', 'bullet'],
    run: (editor) => toggleList(editor, { listStyleType: ListStyleType.Disc }),
  },
  {
    id: 'numbered-list',
    label: 'Numbered list',
    description: 'Create an indented numbered list',
    keywords: ['ordered', 'ol', 'number'],
    run: (editor) => toggleList(editor, { listStyleType: ListStyleType.Decimal }),
  },
  blockCommand('quote', 'Quote', 'blockquote', ['blockquote', 'citation']),
  blockCommand('code-block', 'Code block', 'code_block', ['code', 'pre']),
  {
    id: 'divider',
    label: 'Divider',
    description: 'Insert a horizontal divider',
    run: (editor) => insertEditorNode(editor, { type: 'hr', children: [{ text: '' }] }),
  },
  {
    id: 'table',
    label: 'Table',
    description: 'Insert a 2 × 2 table',
    widget: 'table',
    run: (editor) =>
      insertEditorNode(editor, {
        type: 'table',
        children: [0, 1].map(() => ({
          type: 'tr',
          children: [0, 1].map(() => ({
            type: 'td',
            children: [emptyParagraph()],
          })),
        })),
      }),
  },
  {
    id: 'callout',
    label: 'Callout',
    description: 'Insert a highlighted note box',
    widget: 'callout',
    run: (editor) =>
      insertEditorNode(editor, {
        type: 'callout',
        children: [emptyParagraph()],
      }),
  },
  {
    id: 'columns',
    label: 'Columns',
    description: 'Insert a two-column layout',
    widget: 'columns',
    run: (editor) =>
      insertEditorNode(editor, {
        type: 'column_group',
        children: [
          { type: 'column', width: '50%', children: [emptyParagraph()] },
          { type: 'column', width: '50%', children: [emptyParagraph()] },
        ],
      }),
  },
  {
    id: 'image',
    label: 'Image',
    description: 'Upload an image through workspace storage',
    widget: 'media',
    run: (editor) => insertMediaPlaceholder(editor, 'img'),
  },
  {
    id: 'video',
    label: 'Video',
    description: 'Upload a video through workspace storage',
    widget: 'media',
    run: (editor) => insertMediaPlaceholder(editor, 'video'),
  },
  {
    id: 'audio',
    label: 'Audio',
    description: 'Upload audio through workspace storage',
    widget: 'media',
    run: (editor) => insertMediaPlaceholder(editor, 'audio'),
  },
  {
    id: 'file',
    label: 'File',
    description: 'Upload a document or attachment',
    widget: 'media',
    run: (editor) => insertMediaPlaceholder(editor, 'file'),
  },
  {
    id: 'toggle',
    label: 'Toggle',
    description: 'Insert collapsible content',
    run: (editor) =>
      insertEditorNode(editor, {
        type: KEYS.toggle,
        open: true,
        children: [emptyParagraph()],
      }),
  },
  {
    id: 'mention',
    label: 'Mention',
    description: 'Mention a workspace member',
    keywords: ['user', '@'],
    run: (editor) =>
      insertEditorNode(editor, {
        type: KEYS.mentionInput,
        trigger: '@',
        children: [{ text: '' }],
      }),
  },
  {
    id: 'equation',
    label: 'Equation',
    description: 'Insert a block equation',
    widget: 'math',
    run: (editor) =>
      insertEditorNode(editor, {
        type: 'equation',
        texExpression: '',
        children: [{ text: '' }],
      }),
  },
  {
    id: 'date',
    label: 'Date',
    description: 'Insert today as an inline date',
    widget: 'date',
    run: (editor) =>
      insertEditorNode(editor, {
        type: 'date',
        date: new Date().toISOString().slice(0, 10),
        children: [{ text: '' }],
      }),
  },
  {
    id: 'toc',
    label: 'Table of contents',
    description: 'Insert a generated document outline',
    keywords: ['toc', 'outline'],
    widget: 'toc',
    run: (editor) => insertEditorNode(editor, { type: 'toc', children: [{ text: '' }] }),
  },
  {
    id: 'quiz',
    label: 'Quiz',
    description: 'Author an annotatable quiz block',
    widget: 'quiz',
    run: (editor, dialogs) =>
      dialogs?.openQuiz(undefined, (code) =>
        insertEditorNode(editor, customBlockNode('quiz', code))
      ),
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    description: 'Author an annotatable flashcard set',
    widget: 'flashcards',
    run: (editor, dialogs) =>
      dialogs?.openFlashcards(undefined, (code) =>
        insertEditorNode(editor, customBlockNode('flashcards', code))
      ),
  },
  {
    id: 'mermaid',
    label: 'Mermaid diagram',
    description: 'Insert a Mermaid diagram with a rich caption',
    keywords: ['diagram', 'flowchart'],
    widget: 'mermaid',
    run: (editor) =>
      insertEditorNode(editor, customBlockNode('mermaid', 'flowchart LR\n  A --> B')),
  },
];

export function commandMatches(command: EditorCommand, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [command.label, command.description, ...(command.keywords ?? [])].some((value) =>
    value.toLowerCase().includes(normalized)
  );
}
