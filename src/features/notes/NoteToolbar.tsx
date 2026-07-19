import { useRef, useState } from 'react';
import { AIChatPlugin } from '@platejs/ai/react';
import { ListStyleType, toggleList } from '@platejs/list';
import { SuggestionPlugin } from '@platejs/suggestion/react';
import { TablePlugin } from '@platejs/table/react';
import { KEYS } from 'platejs';
import { useEditorRef, useEditorSelector, usePluginOption } from 'platejs/react';
import type { SlatePlugin } from 'platejs';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bold,
  Braces,
  ChevronDown,
  Code2,
  FileAudio,
  FileText,
  FileVideo,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  MessageSquarePlus,
  MoreHorizontal,
  Pilcrow,
  Quote,
  Redo2,
  Settings2,
  Sparkles,
  Strikethrough,
  Table2,
  Underline,
  Undo2,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Switch,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { useNoteBlockDialogs } from './blocks/dialogContext';
import { customBlockNode } from './blocks/shared';
import { CommentToolbarActions, useCollaborationActions } from './Collaboration';
import {
  downloadEditorFile,
  downloadEditorText,
  exportDocxDocument,
  exportMarkdownDocument,
  importDocxDocument,
  importMarkdownDocument,
} from './documentAdapters';
import { insertMediaPlaceholder } from './MediaNodes';
import { MaterialKit } from './plugins';
import { type WidgetGroupId, useNoteEditorPrefs, WIDGET_GROUPS } from './noteEditorPrefs';
import { useEditorRuntime } from './EditorRuntime';

// Plate's plugin transforms are intentionally richer than its base editor type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEditor = any;

function ToolbarButton({
  label,
  children,
  onClick,
  active,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      data-plate-prevent-deselect
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-row outline-none',
        'focus-visible:ring-focus hover:bg-surface-hover-bg hover:text-fg focus-visible:ring-2',
        'disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4',
        active && 'bg-tint-accent-1 text-tint-accent-1-fg'
      )}
    >
      {children}
    </button>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 after:mx-1.5 after:h-5 after:w-px after:bg-divider last:after:hidden">
      {children}
    </div>
  );
}

export function NoteToolbar({ right, className }: { right?: React.ReactNode; className?: string }) {
  const editor = useEditorRef() as AnyEditor;
  const { canEdit, canComment } = useEditorRuntime();
  const enabled = useNoteEditorPrefs((state) => state.enabled);
  const dialogs = useNoteBlockDialogs();
  const collaboration = useCollaborationActions();
  const suggesting = usePluginOption(SuggestionPlugin, 'isSuggesting');
  const canUndo = useEditorSelector((ed) => ed.history.undos.length > 0, []);
  const canRedo = useEditorSelector((ed) => ed.history.redos.length > 0, []);
  const importInput = useRef<HTMLInputElement>(null);
  const [insertOpen, setInsertOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const mark = (key: string) => {
    editor.tf.focus();
    editor.tf.toggleMark(key);
  };
  const block = (type: string) => {
    editor.tf.focus();
    editor.tf.toggleBlock(type);
  };
  const insertNode = (node: unknown) => {
    editor.tf.focus();
    editor.tf.insertNodes(node, { select: true });
  };
  const tableTf = editor.getTransforms(TablePlugin) as AnyEditor;

  async function importFile(file: File) {
    const document = file.name.toLowerCase().endsWith('.docx')
      ? await importDocxDocument(editor, await file.arrayBuffer())
      : importMarkdownDocument(editor, await file.text());
    editor.tf.insertNodes(document.value);
  }

  function applyLink() {
    const url = linkUrl.trim();
    if (!url) return;
    editor.tf.focus();
    if (editor.api.isCollapsed()) {
      insertNode({ type: KEYS.link, url, children: [{ text: url }] });
    } else {
      editor.tf.wrapNodes({ type: KEYS.link, url, children: [] }, { split: true });
    }
    setLinkOpen(false);
    setLinkUrl('');
  }

  return (
    <>
      <div
        role="toolbar"
        aria-label="Document formatting"
        className={cn(
          'sticky top-0 z-20 flex min-h-10 items-center border-b border-divider bg-surface/95 px-2 backdrop-blur-sm',
          className
        )}
      >
        <div className="flex min-w-0 flex-1 scrollbar-none items-center overflow-x-auto">
          {canEdit && (
            <>
              <ToolbarGroup>
                <ToolbarButton
                  label="Undo"
                  disabled={!canUndo}
                  onClick={() => editor.tf.undo()}
                >
                  <Undo2 />
                </ToolbarButton>
                <ToolbarButton
                  label="Redo"
                  disabled={!canRedo}
                  onClick={() => editor.tf.redo()}
                >
                  <Redo2 />
                </ToolbarButton>
              </ToolbarGroup>
              <ToolbarGroup>
                <ToolbarButton
                  label="AI commands (Ctrl/Cmd+J)"
                  onClick={() => editor.getApi(AIChatPlugin).aiChat.show()}
                >
                  <Sparkles />
                </ToolbarButton>
              </ToolbarGroup>
              <ToolbarGroup>
                <ToolbarButton
                  label="Import Markdown, MDX, or DOCX"
                  onClick={() => importInput.current?.click()}
                >
                  <ArrowUpFromLine />
                </ToolbarButton>
                <input
                  ref={importInput}
                  type="file"
                  className="hidden"
                  accept=".md,.mdx,.docx,text/markdown"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importFile(file);
                    event.target.value = '';
                  }}
                />
                <Popover open={exportOpen} onOpenChange={setExportOpen}>
                  <PopoverTrigger asChild>
                    <span>
                      <ToolbarButton label="Export document" onClick={() => setExportOpen(true)}>
                        <ArrowDownToLine />
                      </ToolbarButton>
                    </span>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-52 border border-line bg-surface p-1 shadow-pop"
                  >
                    <MenuRow
                      label="Markdown (.md)"
                      onClick={() =>
                        downloadEditorText(
                          exportMarkdownDocument(editor),
                          'document.md',
                          'text/markdown'
                        )
                      }
                    />
                    <MenuRow
                      label="MDX (.mdx)"
                      onClick={() =>
                        downloadEditorText(
                          exportMarkdownDocument(editor),
                          'document.mdx',
                          'text/mdx'
                        )
                      }
                    />
                    <MenuRow
                      label="Word (.docx)"
                      onClick={() =>
                        void exportDocxDocument(editor, MaterialKit as SlatePlugin[]).then((blob) =>
                          downloadEditorFile(blob, 'document.docx')
                        )
                      }
                    />
                    <MenuRow
                      label="Plate JSON"
                      onClick={() =>
                        downloadEditorText(
                          JSON.stringify({ schemaVersion: 1, value: editor.children }, null, 2),
                          'document.plate.json',
                          'application/json'
                        )
                      }
                    />
                  </PopoverContent>
                </Popover>
              </ToolbarGroup>
              <ToolbarGroup>
                <BlockTypeMenu onBlock={block} />
              </ToolbarGroup>
              <ToolbarGroup>
                <ToolbarButton label="Bold" onClick={() => mark(KEYS.bold)}>
                  <Bold />
                </ToolbarButton>
                <ToolbarButton label="Italic" onClick={() => mark(KEYS.italic)}>
                  <Italic />
                </ToolbarButton>
                <ToolbarButton label="Underline" onClick={() => mark(KEYS.underline)}>
                  <Underline />
                </ToolbarButton>
                <ToolbarButton label="Strikethrough" onClick={() => mark(KEYS.strikethrough)}>
                  <Strikethrough />
                </ToolbarButton>
                <ToolbarButton label="Inline code" onClick={() => mark(KEYS.code)}>
                  <Code2 />
                </ToolbarButton>
                <ToolbarButton label="Highlight" onClick={() => mark(KEYS.highlight)}>
                  <Highlighter />
                </ToolbarButton>
              </ToolbarGroup>
              <ToolbarGroup>
                <AlignMenu editor={editor} />
                <ToolbarButton
                  label="Numbered list"
                  onClick={() => toggleList(editor, { listStyleType: ListStyleType.Decimal })}
                >
                  <ListOrdered />
                </ToolbarButton>
                <ToolbarButton
                  label="Bulleted list"
                  onClick={() => toggleList(editor, { listStyleType: ListStyleType.Disc })}
                >
                  <List />
                </ToolbarButton>
                <ToolbarButton
                  label="Task list"
                  onClick={() => {
                    toggleList(editor, { listStyleType: ListStyleType.Disc });
                    editor.tf.setNodes({ checked: false });
                  }}
                >
                  <ListChecks />
                </ToolbarButton>
              </ToolbarGroup>
              <ToolbarGroup>
                <ToolbarButton label="Link" onClick={() => setLinkOpen(true)}>
                  <Link />
                </ToolbarButton>
                {enabled.table && (
                  <TableMenu
                    onInsert={() =>
                      tableTf.insert.table({ rowCount: 3, colCount: 3 }, { select: true })
                    }
                    transforms={tableTf}
                  />
                )}
              </ToolbarGroup>
              {enabled.media && (
                <ToolbarGroup>
                  <ToolbarButton
                    label="Upload image"
                    onClick={() => insertMediaPlaceholder(editor, 'img')}
                  >
                    <Image />
                  </ToolbarButton>
                  <ToolbarButton
                    label="Upload video"
                    onClick={() => insertMediaPlaceholder(editor, 'video')}
                  >
                    <FileVideo />
                  </ToolbarButton>
                  <ToolbarButton
                    label="Upload audio"
                    onClick={() => insertMediaPlaceholder(editor, 'audio')}
                  >
                    <FileAudio />
                  </ToolbarButton>
                  <ToolbarButton
                    label="Upload file"
                    onClick={() => insertMediaPlaceholder(editor, 'file')}
                  >
                    <FileText />
                  </ToolbarButton>
                </ToolbarGroup>
              )}
              <ToolbarGroup>
                <ToolbarButton label="Outdent" onClick={() => editor.tf.outdent()}>
                  <IndentDecrease />
                </ToolbarButton>
                <ToolbarButton label="Indent" onClick={() => editor.tf.indent()}>
                  <IndentIncrease />
                </ToolbarButton>
                <Popover open={moreOpen} onOpenChange={setMoreOpen}>
                  <PopoverTrigger asChild>
                    <span>
                      <ToolbarButton label="More formatting" onClick={() => setMoreOpen(true)}>
                        <MoreHorizontal />
                      </ToolbarButton>
                    </span>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-60 border border-line bg-surface p-1 shadow-pop"
                  >
                    {enabled.callout && (
                      <MenuRow
                        label="Callout"
                        onClick={() =>
                          insertNode({
                            type: KEYS.callout,
                            children: [{ type: KEYS.p, children: [{ text: '' }] }],
                          })
                        }
                      />
                    )}
                    {enabled.columns && (
                      <MenuRow label="Two columns" onClick={() => insertNode(twoColumns())} />
                    )}
                    {enabled.math && (
                      <MenuRow
                        label="Equation"
                        onClick={() =>
                          insertNode({
                            type: KEYS.equation,
                            texExpression: '',
                            children: [{ text: '' }],
                          })
                        }
                      />
                    )}
                    {enabled.date && (
                      <MenuRow
                        label="Date"
                        onClick={() =>
                          insertNode({
                            type: KEYS.date,
                            date: new Date().toISOString().slice(0, 10),
                            children: [{ text: '' }],
                          })
                        }
                      />
                    )}
                    {enabled.toc && (
                      <MenuRow
                        label="Table of contents"
                        onClick={() => insertNode({ type: KEYS.toc, children: [{ text: '' }] })}
                      />
                    )}
                    {enabled.quiz && (
                      <MenuRow
                        label="Quiz"
                        onClick={() =>
                          dialogs.openQuiz(undefined, (code) =>
                            insertNode(customBlockNode('quiz', code))
                          )
                        }
                      />
                    )}
                    {enabled.flashcards && (
                      <MenuRow
                        label="Flashcards"
                        onClick={() =>
                          dialogs.openFlashcards(undefined, (code) =>
                            insertNode(customBlockNode('flashcards', code))
                          )
                        }
                      />
                    )}
                    {enabled.mermaid && (
                      <MenuRow
                        label="Diagram"
                        onClick={() =>
                          insertNode(customBlockNode('mermaid', 'flowchart LR\n  A --> B'))
                        }
                      />
                    )}
                    <MenuRow label="Code block" onClick={() => block(KEYS.codeBlock)} />
                    <MenuRow label="Blockquote" onClick={() => block(KEYS.blockquote)} />
                    <MenuRow label="Subscript" onClick={() => mark(KEYS.sub)} />
                    <MenuRow label="Superscript" onClick={() => mark(KEYS.sup)} />
                    <MenuRow label="Clear formatting" onClick={() => editor.tf.removeMarks()} />
                  </PopoverContent>
                </Popover>
              </ToolbarGroup>
              <ToolbarGroup>
                <ToolbarButton
                  label={suggesting ? 'Stop suggesting' : 'Suggest edits'}
                  active={suggesting}
                  onClick={() => editor.setOption(SuggestionPlugin, 'isSuggesting', !suggesting)}
                >
                  <MessageSquarePlus />
                </ToolbarButton>
              </ToolbarGroup>
            </>
          )}
          {(canComment || !canEdit) && (
            <ToolbarGroup>
              <CommentToolbarActions />
            </ToolbarGroup>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
          {right}
          <WidgetSettingsDialog />
        </div>
      </div>
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Insert link</DialogTitle>
          <label className="flex flex-col gap-2">
            <span className="t-label text-fg-muted">URL</span>
            <input
              autoFocus
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://example.com"
              className="focus:ring-focus rounded-input border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:ring-2"
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyLink();
              }}
            />
          </label>
          <DialogFooter>
            <Button variant="ghost-hover" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button variant="accent" disabled={!linkUrl.trim()} onClick={applyLink}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BlockTypeMenu({ onBlock }: { onBlock: (type: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 items-center gap-1 rounded-row px-2 text-sm text-fg-secondary hover:bg-surface-hover-bg"
        >
          <Pilcrow className="size-4" />
          <ChevronDown className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 border border-line bg-surface p-1 shadow-pop">
        <MenuRow label="Paragraph" icon={<Pilcrow />} onClick={() => onBlock(KEYS.p)} />
        <MenuRow label="Heading 1" icon={<Heading1 />} onClick={() => onBlock(KEYS.h1)} />
        <MenuRow label="Heading 2" icon={<Heading2 />} onClick={() => onBlock(KEYS.h2)} />
        <MenuRow label="Heading 3" icon={<Heading3 />} onClick={() => onBlock(KEYS.h3)} />
        <MenuRow label="Blockquote" icon={<Quote />} onClick={() => onBlock(KEYS.blockquote)} />
        <MenuRow label="Code block" icon={<Braces />} onClick={() => onBlock(KEYS.codeBlock)} />
      </PopoverContent>
    </Popover>
  );
}

function AlignMenu({ editor }: { editor: AnyEditor }) {
  const [open, setOpen] = useState(false);
  const align = (value: string) => editor.tf.setNodes({ align: value });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <ToolbarButton label="Text alignment" onClick={() => setOpen(true)}>
            <AlignLeft />
          </ToolbarButton>
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex w-auto gap-1 border border-line bg-surface p-1 shadow-pop"
      >
        <ToolbarButton label="Align left" onClick={() => align('left')}>
          <AlignLeft />
        </ToolbarButton>
        <ToolbarButton label="Align center" onClick={() => align('center')}>
          <AlignCenter />
        </ToolbarButton>
        <ToolbarButton label="Align right" onClick={() => align('right')}>
          <AlignRight />
        </ToolbarButton>
        <ToolbarButton label="Justify" onClick={() => align('justify')}>
          <AlignJustify />
        </ToolbarButton>
      </PopoverContent>
    </Popover>
  );
}

function TableMenu({ onInsert, transforms }: { onInsert: () => void; transforms: AnyEditor }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <ToolbarButton label="Table controls" onClick={() => setOpen(true)}>
            <Table2 />
          </ToolbarButton>
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 border border-line bg-surface p-1 shadow-pop">
        <MenuRow label="Insert 3 × 3 table" onClick={onInsert} />
        <MenuRow
          label="Insert row above"
          onClick={() => transforms.insert.tableRow({ before: true })}
        />
        <MenuRow label="Insert row below" onClick={() => transforms.insert.tableRow()} />
        <MenuRow
          label="Insert column left"
          onClick={() => transforms.insert.tableColumn({ before: true })}
        />
        <MenuRow label="Insert column right" onClick={() => transforms.insert.tableColumn()} />
        <MenuRow label="Merge cells" onClick={() => transforms.table.merge()} />
        <MenuRow label="Split cell" onClick={() => transforms.table.split()} />
        <MenuRow label="Delete row" onClick={() => transforms.remove.tableRow()} />
        <MenuRow label="Delete column" onClick={() => transforms.remove.tableColumn()} />
        <MenuRow label="Delete table" onClick={() => transforms.remove.table()} />
      </PopoverContent>
    </Popover>
  );
}

function MenuRow({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-row px-2 py-1.5 text-left text-sm text-fg hover:bg-surface-hover-bg [&_svg]:size-4"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function twoColumns() {
  return {
    type: KEYS.columnGroup,
    children: [
      { type: KEYS.column, width: '50%', children: [{ type: KEYS.p, children: [{ text: '' }] }] },
      { type: KEYS.column, width: '50%', children: [{ type: KEYS.p, children: [{ text: '' }] }] },
    ],
  };
}

function WidgetSettingsDialog() {
  const enabled = useNoteEditorPrefs((state) => state.enabled);
  const setEnabled = useNoteEditorPrefs((state) => state.setEnabled);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(enabled);
  const count = WIDGET_GROUPS.filter((group) => draft[group.id]).length;

  const setAll = (value: boolean) =>
    setDraft(
      WIDGET_GROUPS.reduce(
        (next, group) => ({ ...next, [group.id]: value }),
        {} as Record<WidgetGroupId, boolean>
      )
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft({ ...enabled });
        setOpen(next);
      }}
    >
      <button
        type="button"
        aria-label="Editor command settings"
        title="Editor command settings"
        className="inline-flex size-8 items-center justify-center rounded-row hover:bg-surface-hover-bg"
        onClick={() => setOpen(true)}
      >
        <Settings2 className="size-4" />
      </button>
      <DialogContent className="max-w-xl">
        <DialogTitle className="pb-2">Editor commands</DialogTitle>
        <p className="mb-4 text-sm text-fg-muted">
          Choose which optional commands appear in toolbars and the slash menu. Existing document
          content always remains enabled.
        </p>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-fg">
            {count} of {WIDGET_GROUPS.length} enabled
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setAll(true)}>
              All
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAll(false)}>
              None
            </Button>
          </div>
        </div>
        <div className="grid max-h-[52vh] grid-cols-1 gap-2 overflow-auto pr-1 sm:grid-cols-2">
          {WIDGET_GROUPS.map((group) => (
            <label
              key={group.id}
              className="flex items-center justify-between gap-3 rounded-card border border-line px-3 py-2"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-fg">{group.label}</span>
                <span className="block text-xs text-fg-muted">{group.description}</span>
              </span>
              <Switch
                checked={draft[group.id]}
                onChange={() =>
                  setDraft((current) => ({ ...current, [group.id]: !current[group.id] }))
                }
              />
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost-hover" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={() => {
              setEnabled(draft);
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
