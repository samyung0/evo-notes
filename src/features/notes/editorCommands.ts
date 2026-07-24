import { ListStyleType, toggleList } from '@platejs/list';
import {
  Braces,
  CircleAlert,
  Columns2,
  Columns3,
  FileAudio,
  FileText,
  FileVideo,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Info,
  List,
  ListChecks,
  ListOrdered,
  MessageSquarePlus,
  Minus,
  PanelLeft,
  PanelRight,
  Pilcrow,
  Quote,
  Sigma,
  Table2,
  type LucideIcon,
} from 'lucide-react';
import { KEYS } from 'platejs';
import type { WidgetGroupId } from './noteEditorPrefs';
import type { NoteBlockDialogsApi } from './blocks/dialogContext';
import { customBlockNode } from './blocks/shared';
import { insertMediaPlaceholder } from './MediaNodes';
import { toggleEditorBlock } from './editorTransforms';
import { insertEditorNode, type NoteEditorInstance } from './insertEditorNode';
import { COLUMN_LAYOUTS } from './richBlockConfig';

export { insertEditorNode, type NoteEditorInstance } from './insertEditorNode';

export type EditorCommandGroup = 'basic' | 'lists' | 'media' | 'advanced' | 'inline';

export interface EditorCommand {
  id: string;
  label: string;
  description: string;
  group: EditorCommandGroup;
  icon: LucideIcon;
  shortcut?: string;
  focusEditor?: boolean;
  keywords?: string[];
  widget?: WidgetGroupId;
  run: (editor: NoteEditorInstance, dialogs?: NoteBlockDialogsApi | null) => void;
}

export function emptyParagraph() {
  return { type: 'p', children: [{ text: '' }] };
}

export function columnGroupFromWidths(widths: readonly string[]) {
  return {
    type: KEYS.columnGroup,
    children: widths.map((width) => ({
      type: KEYS.column,
      width,
      children: [emptyParagraph()],
    })),
  };
}

function blockCommand(
  id: string,
  label: string,
  type: string,
  icon: LucideIcon,
  group: EditorCommandGroup,
  keywords: string[] = [],
  shortcut?: string
) {
  return {
    id,
    label,
    description: `Turn the current block into ${label.toLowerCase()}`,
    group,
    icon,
    shortcut,
    keywords,
    run: (editor: NoteEditorInstance) => {
      editor.tf.focus();
      toggleEditorBlock(editor, type);
    },
  } satisfies EditorCommand;
}

function listCommand(
  id: string,
  label: string,
  listStyleType: string,
  icon: LucideIcon,
  keywords: string[] = []
) {
  return {
    id,
    label,
    description: `Create an indented ${label.toLowerCase()}`,
    group: 'lists',
    icon,
    keywords,
    run: (editor: NoteEditorInstance) => {
      editor.tf.focus();
      toggleList(editor, { listStyleType });
    },
  } satisfies EditorCommand;
}

function columnCommand(
  id: string,
  label: string,
  widths: readonly string[],
  icon: LucideIcon,
  keywords: string[] = []
) {
  return {
    id,
    label,
    description: `Insert ${label.toLowerCase()}`,
    group: 'advanced',
    icon,
    widget: 'columns',
    keywords,
    run: (editor: NoteEditorInstance) => insertEditorNode(editor, columnGroupFromWidths(widths)),
  } satisfies EditorCommand;
}

export const EDITOR_COMMANDS: EditorCommand[] = [
  blockCommand('paragraph', 'Text', 'p', Pilcrow, 'basic', ['paragraph', 'plain']),
  blockCommand(
    'heading-1',
    'Heading 1',
    'h1',
    Heading1,
    'basic',
    ['title', 'h1'],
    'Ctrl/Cmd+Alt+1'
  ),
  blockCommand(
    'heading-2',
    'Heading 2',
    'h2',
    Heading2,
    'basic',
    ['subtitle', 'h2'],
    'Ctrl/Cmd+Alt+2'
  ),
  blockCommand(
    'heading-3',
    'Heading 3',
    'h3',
    Heading3,
    'basic',
    ['section', 'h3'],
    'Ctrl/Cmd+Alt+3'
  ),
  blockCommand('heading-4', 'Heading 4', 'h4', Heading1, 'basic', ['h4']),
  blockCommand('heading-5', 'Heading 5', 'h5', Heading2, 'basic', ['h5']),
  blockCommand('heading-6', 'Heading 6', 'h6', Heading3, 'basic', ['h6']),
  blockCommand(
    'quote',
    'Blockquote',
    'blockquote',
    Quote,
    'basic',
    ['quote', 'citation'],
    'Ctrl/Cmd+Shift+.'
  ),
  blockCommand(
    'code-block',
    'Code block',
    'code_block',
    Braces,
    'basic',
    ['code', 'pre'],
    'Ctrl/Cmd+Alt+8'
  ),
  {
    id: 'divider',
    label: 'Divider',
    description: 'Insert a horizontal divider',
    group: 'basic',
    icon: Minus,
    run: (editor) => insertEditorNode(editor, { type: KEYS.hr, children: [{ text: '' }] }),
  },
  listCommand('bulleted-list', 'Bulleted list', ListStyleType.Disc, List, [
    'unordered',
    'ul',
    'bullet',
  ]),
  listCommand('numbered-list', 'Numbered list', ListStyleType.Decimal, ListOrdered, [
    'ordered',
    'ol',
    'number',
  ]),
  listCommand('task-list', 'Task list', KEYS.listTodo, ListChecks, ['todo', 'checklist']),
  {
    id: 'table',
    label: 'Table',
    description: 'Insert a 2 × 2 table',
    group: 'advanced',
    icon: Table2,
    widget: 'table',
    run: (editor) =>
      insertEditorNode(editor, {
        type: KEYS.table,
        children: [0, 1].map(() => ({
          type: KEYS.tr,
          children: [0, 1].map(() => ({
            type: KEYS.td,
            children: [emptyParagraph()],
          })),
        })),
      }),
  },
  {
    id: 'callout',
    label: 'Callout',
    description: 'Insert a highlighted note box',
    group: 'advanced',
    icon: Info,
    widget: 'callout',
    run: (editor) =>
      insertEditorNode(editor, {
        type: KEYS.callout,
        variant: 'info',
        children: [emptyParagraph()],
      }),
  },
  ...COLUMN_LAYOUTS.map((layout) =>
    columnCommand(
      layout.value === 'equal-2' ? 'columns' : `columns-${layout.value}`,
      layout.value === 'equal-2' ? 'Two columns' : layout.label,
      layout.widths,
      layout.value === 'equal-3'
        ? Columns3
        : layout.value === 'left-wide'
          ? PanelRight
          : layout.value === 'right-wide'
            ? PanelLeft
            : Columns2,
      ['columns', 'layout']
    )
  ),
  {
    id: 'image',
    label: 'Image',
    description: 'Upload an image through workspace storage',
    group: 'media',
    icon: Image,
    widget: 'media',
    run: (editor) => insertMediaPlaceholder(editor, 'img'),
  },
  {
    id: 'video',
    label: 'Video',
    description: 'Upload a video through workspace storage',
    group: 'media',
    icon: FileVideo,
    widget: 'media',
    run: (editor) => insertMediaPlaceholder(editor, 'video'),
  },
  {
    id: 'audio',
    label: 'Audio',
    description: 'Upload audio through workspace storage',
    group: 'media',
    icon: FileAudio,
    widget: 'media',
    run: (editor) => insertMediaPlaceholder(editor, 'audio'),
  },
  {
    id: 'file',
    label: 'File',
    description: 'Upload a document or attachment',
    group: 'media',
    icon: FileText,
    widget: 'media',
    run: (editor) => insertMediaPlaceholder(editor, 'file'),
  },
  {
    id: 'mention',
    label: 'Mention',
    description: 'Mention a workspace member',
    group: 'inline',
    icon: MessageSquarePlus,
    focusEditor: false,
    keywords: ['user', '@'],
    // Use the trigger path (same as typing `@`). Inserting mention_input via
    // insertEditorNode focuses the editor and immediately blur-cancels to `@`.
    run: (editor) => {
      editor.tf.insertText('@');
    },
  },
  {
    id: 'equation',
    label: 'Equation',
    description: 'Insert a block equation',
    group: 'advanced',
    icon: Sigma,
    widget: 'math',
    run: (editor) =>
      insertEditorNode(editor, {
        type: KEYS.equation,
        texExpression: '',
        children: [{ text: '' }],
      }),
  },
  {
    id: 'inline-equation',
    label: 'Inline equation',
    description: 'Insert an inline equation',
    group: 'inline',
    icon: Sigma,
    widget: 'math',
    run: (editor) => {
      editor.tf.focus();
      editor.tf.insertNodes({
        type: KEYS.inlineEquation,
        texExpression: '',
        children: [{ text: '' }],
      });
    },
  },
  {
    id: 'toc',
    label: 'Table of contents',
    description: 'Insert a generated document outline',
    group: 'advanced',
    icon: List,
    keywords: ['toc', 'outline'],
    widget: 'toc',
    run: (editor) => insertEditorNode(editor, { type: KEYS.toc, children: [{ text: '' }] }),
  },
  {
    id: 'quiz',
    label: 'Quiz',
    description: 'Author an annotatable quiz block',
    group: 'advanced',
    icon: CircleAlert,
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
    group: 'advanced',
    icon: ListChecks,
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
    group: 'advanced',
    icon: Braces,
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
