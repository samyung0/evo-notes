import { useState } from 'react';
import { useEditorRef } from 'platejs/react';
import {
  Button,
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Switch,
  Text,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { useNoteBlockDialogs } from './blocks/dialogContext';
import { customBlockNode } from './blocks/shared';
import { useNoteEditorPrefs, WIDGET_GROUPS } from './noteEditorPrefs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEditor = any;

function insertNode(editor: AnyEditor, node: unknown) {
  editor.tf.focus();
  editor.tf.insertNodes(node, { select: true });
}

function emptyParagraph() {
  return { type: 'p', children: [{ text: '' }] };
}

function ToolbarButton({
  onClick,
  title,
  children,
  active,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'rounded-row px-2 py-1 text-sm text-fg-secondary hover:bg-surface-hover-bg hover:text-fg',
        active && 'bg-surface-hover-bg text-fg'
      )}
    >
      {children}
    </button>
  );
}

/** Formatting + insert toolbar for the note editor. Insert options respect the
 * enabled widget groups; quiz/flashcards open authoring popups. */
export function NoteToolbar({ right }: { right?: React.ReactNode }) {
  const editor = useEditorRef();
  const dialogs = useNoteBlockDialogs();
  const enabled = useNoteEditorPrefs((s) => s.enabled);
  const [insertOpen, setInsertOpen] = useState(false);

  const mark = (key: string) => () => {
    editor.tf.focus();
    editor.tf.toggleMark(key);
  };
  const block = (type: string) => () => {
    editor.tf.focus();
    editor.tf.toggleBlock(type);
  };

  function insertTable() {
    insertNode(editor, {
      type: 'table',
      children: [0, 1].map(() => ({
        type: 'tr',
        children: [0, 1].map(() => ({ type: 'td', children: [emptyParagraph()] })),
      })),
    });
    setInsertOpen(false);
  }
  function insertCallout() {
    insertNode(editor, { type: 'callout', children: [{ text: '' }] });
    setInsertOpen(false);
  }
  function insertColumns() {
    insertNode(editor, {
      type: 'column_group',
      children: [
        { type: 'column', width: '50%', children: [emptyParagraph()] },
        { type: 'column', width: '50%', children: [emptyParagraph()] },
      ],
    });
    setInsertOpen(false);
  }
  function insertImage() {
    const url = window.prompt('Image URL');
    if (url) insertNode(editor, { type: 'img', url, children: [{ text: '' }] });
    setInsertOpen(false);
  }
  function insertLink() {
    const url = window.prompt('Link URL');
    if (!url) return;
    insertNode(editor, { type: 'a', url, children: [{ text: url }] });
  }
  function insertEquation() {
    editor.tf.focus();
    (editor.tf as AnyEditor).insert?.equation?.();
    setInsertOpen(false);
  }
  function insertDate() {
    insertNode(editor, {
      type: 'date',
      date: new Date().toISOString().slice(0, 10),
      children: [{ text: '' }],
    });
    setInsertOpen(false);
  }
  function insertToc() {
    insertNode(editor, { type: 'toc', children: [{ text: '' }] });
    setInsertOpen(false);
  }
  function insertQuiz() {
    setInsertOpen(false);
    dialogs.openQuiz(undefined, (code) => insertNode(editor, customBlockNode('quiz', code)));
  }
  function insertFlashcards() {
    setInsertOpen(false);
    dialogs.openFlashcards(undefined, (code) =>
      insertNode(editor, customBlockNode('flashcards', code))
    );
  }
  function insertMermaid() {
    setInsertOpen(false);
    const code = window.prompt('Mermaid diagram source', 'flowchart LR\n  A --> B');
    if (code) insertNode(editor, customBlockNode('mermaid', code));
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-divider px-2 py-1.5">
      <ToolbarButton onClick={block('h1')} title="Heading 1">
        <span className="font-bold">H1</span>
      </ToolbarButton>
      <ToolbarButton onClick={block('h2')} title="Heading 2">
        <span className="font-bold">H2</span>
      </ToolbarButton>
      <ToolbarButton onClick={block('h3')} title="Heading 3">
        <span className="font-bold">H3</span>
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-divider" />
      <ToolbarButton onClick={mark('bold')} title="Bold">
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton onClick={mark('italic')} title="Italic">
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton onClick={mark('underline')} title="Underline">
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton onClick={mark('strikethrough')} title="Strikethrough">
        <span className="line-through">S</span>
      </ToolbarButton>
      <ToolbarButton onClick={mark('code')} title="Inline code">
        <span className="font-mono">{'</>'}</span>
      </ToolbarButton>
      <ToolbarButton onClick={mark('highlight')} title="Highlight">
        <span className="bg-tint-accent-2 px-0.5">H</span>
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-divider" />
      <ToolbarButton onClick={block('ul')} title="Bulleted list">
        •
      </ToolbarButton>
      <ToolbarButton onClick={block('ol')} title="Numbered list">
        1.
      </ToolbarButton>
      <ToolbarButton onClick={block('blockquote')} title="Quote">
        ❝
      </ToolbarButton>
      <ToolbarButton onClick={block('code_block')} title="Code block">
        {'{ }'}
      </ToolbarButton>
      <ToolbarButton onClick={insertLink} title="Link">
        🔗
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-divider" />

      <Popover open={insertOpen} onOpenChange={setInsertOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            + Insert
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-56 border border-line bg-surface shadow-pop"
        >
          <Text variant="label" tone="muted">
            Insert block
          </Text>
          <div className="flex flex-col">
            {enabled.table && <InsertRow label="Table" onClick={insertTable} />}
            {enabled.callout && <InsertRow label="Callout" onClick={insertCallout} />}
            {enabled.columns && <InsertRow label="Columns" onClick={insertColumns} />}
            {enabled.media && <InsertRow label="Image" onClick={insertImage} />}
            {enabled.math && <InsertRow label="Equation" onClick={insertEquation} />}
            {enabled.date && <InsertRow label="Date" onClick={insertDate} />}
            {enabled.toc && <InsertRow label="Table of contents" onClick={insertToc} />}
            {enabled.quiz && <InsertRow label="Quiz" onClick={insertQuiz} />}
            {enabled.flashcards && <InsertRow label="Flashcards" onClick={insertFlashcards} />}
            {enabled.mermaid && <InsertRow label="Diagram" onClick={insertMermaid} />}
          </div>
        </PopoverContent>
      </Popover>

      <div className="ml-auto flex items-center gap-1">
        {right}
        <WidgetSettings />
      </div>
    </div>
  );
}

function InsertRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-row px-2 py-1.5 text-left text-sm text-fg hover:bg-surface-hover-bg"
    >
      {label}
    </button>
  );
}

function WidgetSettings() {
  const enabled = useNoteEditorPrefs((s) => s.enabled);
  const toggle = useNoteEditorPrefs((s) => s.toggle);
  const setAll = useNoteEditorPrefs((s) => s.setAll);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton icon="settings" variant="ghost" size="sm" label="Editor widgets" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 border border-line bg-surface shadow-pop">
        <div className="flex items-center justify-between">
          <Text variant="label" tone="muted">
            Widgets
          </Text>
          <div className="flex gap-1">
            <button
              type="button"
              className="t-label text-fg-muted hover:text-fg"
              onClick={() => setAll(true)}
            >
              All
            </button>
            <span className="text-fg-muted">/</span>
            <button
              type="button"
              className="t-label text-fg-muted hover:text-fg"
              onClick={() => setAll(false)}
            >
              None
            </button>
          </div>
        </div>
        <div className="flex max-h-80 flex-col gap-1 overflow-auto">
          {WIDGET_GROUPS.map((g) => (
            <label key={g.id} className="flex items-center justify-between gap-2 py-1">
              <span className="flex flex-col">
                <span className="text-sm text-fg">{g.label}</span>
                <span className="text-xs text-fg-muted">{g.description}</span>
              </span>
              <Switch checked={enabled[g.id]} onChange={() => toggle(g.id)} />
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
