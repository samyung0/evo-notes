import { useLayoutEffect, useRef, useState } from 'react';
import { AIChatPlugin } from '@platejs/ai/react';
import { toUnitLess } from '@platejs/basic-styles';
import { FontSizePlugin } from '@platejs/basic-styles/react';
import { encodeUrlIfNeeded, upsertLink, validateUrl } from '@platejs/link';
import { ListStyleType, toggleList } from '@platejs/list';
import { TablePlugin, useTableMergeState } from '@platejs/table/react';
import { KEYS } from 'platejs';
import { useEditorPlugin, useEditorRef, useEditorSelector } from 'platejs/react';
import type { SlatePlugin } from 'platejs';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpFromLine,
  Baseline,
  Bold,
  Braces,
  ChevronDown,
  Combine,
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
  Minus,
  PaintBucket,
  Pilcrow,
  Plus,
  Quote,
  Redo2,
  Settings2,
  Sparkles,
  Strikethrough,
  Table2,
  Trash2,
  Ungroup,
  Underline,
  Undo2,
  X,
  Grid3X3,
} from 'lucide-react';
import {
  Button,
  ColorPicker,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Input,
  InputError,
  InputTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Switch,
  userToast,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { useNoteBlockDialogs } from './blocks/dialogContext';
import { customBlockNode } from './blocks/shared';
import { CommentToolbarActions } from './Collaboration';
import {
  downloadEditorFile,
  downloadEditorText,
  exportDocxDocument,
  exportMarkdownDocument,
  importDocxDocument,
  importJsonDocument,
  importMarkdownDocument,
} from './documentAdapters';
import { insertMediaPlaceholder } from './MediaNodes';
import { MaterialKit } from './plugins';
import { type WidgetGroupId, useNoteEditorPrefs, WIDGET_GROUPS } from './noteEditorPrefs';
import { useEditorRuntime } from './EditorRuntime';
import { canCreateExternalEditorAssets } from './editorMode';
import { insertEditorNode } from './insertEditorNode';
import { getHiddenToolbarGroupIndexes } from './responsiveToolbar';

// TODO: what is this
// Plate's plugin transforms are intentionally richer than its base editor type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEditor = any;

function ToolbarButton({
  label,
  children,
  onClick,
  active,
  disabled,
  className,
  ...rest
}: React.ComponentProps<'button'> & {
  label: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-slot="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      data-plate-prevent-deselect
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'relative inline-flex size-8 shrink-0 items-center justify-center gap-1 rounded-row px-0.5 outline-none',
        'focus-visible:ring-focus hover:bg-surface-hover-bg hover:text-fg focus-visible:ring-2',
        'disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4',
        'font-semibold whitespace-nowrap transition-all duration-150 outline-none select-none',
        active && 'bg-tint-accent-1 text-tint-accent-1-fg',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

function ToolbarGroup({
  children,
  className,
  persistent = false,
}: {
  children: React.ReactNode;
  className?: string;
  persistent?: boolean;
}) {
  return (
    <div
      data-toolbar-group
      data-toolbar-persistent={persistent || undefined}
      className={cn(
        'flex h-full shrink-0 items-center gap-0 after:mx-1.5 after:h-7 after:w-px after:bg-divider last:after:hidden',
        className
      )}
    >
      {children}
    </div>
  );
}

function updateResponsiveToolbar(container: HTMLDivElement) {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(':scope > [data-toolbar-group]')
  );
  elements.forEach((element) => {
    element.hidden = false;
  });
  const groups = elements.map((element) => ({
    width: element.getBoundingClientRect().width,
    persistent: element.hasAttribute('data-toolbar-persistent'),
  }));
  const hiddenIndexes = getHiddenToolbarGroupIndexes(
    groups,
    Math.max(0, container.clientWidth - 2)
  );

  elements.forEach((element, index) => {
    element.hidden = hiddenIndexes.has(index);
  });
}

export function NoteToolbar({ right, className }: { right?: React.ReactNode; className?: string }) {
  const editor = useEditorRef() as AnyEditor;
  const toolbarGroupsRef = useRef<HTMLDivElement>(null);
  const { mode, allowExternalAssets } = useEditorRuntime();
  const canCreateAssets = canCreateExternalEditorAssets(mode, allowExternalAssets);
  const enabled = useNoteEditorPrefs((state) => state.enabled);
  const dialogs = useNoteBlockDialogs();
  const canUndo = useEditorSelector((ed) => ed.history.undos.length > 0, []);
  const canRedo = useEditorSelector((ed) => ed.history.redos.length > 0, []);

  const [moreOpen, setMoreOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState('');

  useLayoutEffect(() => {
    const container = toolbarGroupsRef.current;
    if (!container) return;

    const update = () => updateResponsiveToolbar(container);
    const resizeObserver = new ResizeObserver(update);
    const mutationObserver = new MutationObserver(update);

    update();
    resizeObserver.observe(container);
    mutationObserver.observe(container, { childList: true, subtree: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  const mark = (key: string) => {
    editor.tf.focus();
    editor.tf.toggleMark(key);
  };
  const block = (type: string) => {
    editor.tf.focus();
    editor.tf.toggleBlock(type);
  };
  const insertNode = (node: unknown) => insertEditorNode(editor, node);
  async function importFile(file: File, kind: ImportKind) {
    const document =
      kind === 'docx'
        ? await importDocxDocument(editor, await file.arrayBuffer())
        : kind === 'json'
          ? importJsonDocument(editor, await file.text())
          : importMarkdownDocument(editor, await file.text());
    editor.tf.insertNodes(document.value);
  }

  function applyLink() {
    const url = encodeUrlIfNeeded(linkUrl.trim());
    if (!url) return;
    if (!validateUrl(editor, url)) {
      setLinkError('Enter a valid web, email, telephone, document, or anchor URL.');
      return;
    }

    editor.tf.focus();
    if (!upsertLink(editor, { url })) {
      setLinkError('Select text or place the cursor where the link should be inserted.');
      return;
    }

    setLinkOpen(false);
    setLinkUrl('');
    setLinkError('');
  }

  return (
    <>
      <div
        role="toolbar"
        aria-label="Document formatting"
        className={cn(
          'sticky top-0 z-20 flex h-10 items-center border-b border-divider bg-surface/95 px-2 backdrop-blur-sm',
          className
        )}
      >
        <div
          ref={toolbarGroupsRef}
          className="flex h-full min-w-0 flex-1 items-center overflow-hidden"
        >
          <>
            <ToolbarGroup>
              <ToolbarButton label="Undo" disabled={!canUndo} onClick={() => editor.tf.undo()}>
                <Undo2 />
              </ToolbarButton>
              <ToolbarButton label="Redo" disabled={!canRedo} onClick={() => editor.tf.redo()}>
                <Redo2 />
              </ToolbarButton>
            </ToolbarGroup>
            {allowExternalAssets && (
              <ToolbarGroup>
                <ToolbarButton
                  label="AI commands (Ctrl/Cmd+J)"
                  onClick={() => editor.getApi(AIChatPlugin).aiChat.show()}
                  className="size-fit gap-1.5 px-2 py-1"
                >
                  <Sparkles />
                  <span className="translate-y-px">Ask AI</span>
                </ToolbarButton>
              </ToolbarGroup>
            )}
            <ToolbarGroup className="gap-1">
              {canCreateAssets && <ImportMenu importFile={importFile} />}
              <ExportMenu editor={editor} />
            </ToolbarGroup>
            <ToolbarGroup persistent className="gap-1">
              <Popover open={moreOpen} onOpenChange={setMoreOpen}>
                <PopoverTrigger asChild>
                  <span>
                    <ToolbarButton
                      label="More formatting"
                      className="w-fit"
                      onClick={() => setMoreOpen(true)}
                    >
                      <Plus />
                      <ChevronDown className="size-3! text-fg-secondary" />
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
                          variant: 'info',
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
                  {enabled.toc && (
                    <MenuRow
                      label="Table of contents"
                      onClick={() => insertNode({ type: KEYS.toc, children: [{ text: '' }] })}
                    />
                  )}
                  {/* TODO: add in heading 4,5,6,bullet list, numbered list, task list, and column layouts  */}
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
              <BlockTypeMenu onBlock={block} />
            </ToolbarGroup>
            {enabled.fontStyles && (
              <ToolbarGroup>
                <FontSizeControl />
                <FontColorControl
                  label="Text color"
                  markKey={KEYS.color}
                  icon={<Baseline />}
                  fallbackColor="var(--color-fg)"
                />
                <FontColorControl
                  label="Background color"
                  markKey={KEYS.backgroundColor}
                  icon={<PaintBucket />}
                  fallbackColor="transparent"
                />
              </ToolbarGroup>
            )}
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
              {enabled.fontStyles && <AlignMenu editor={editor} />}
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
                onClick={() => toggleList(editor, { listStyleType: KEYS.listTodo })}
              >
                <ListChecks />
              </ToolbarButton>
            </ToolbarGroup>
            <ToolbarGroup>
              <ToolbarButton
                label="Link"
                onClick={() => {
                  const entry = editor.api.above({
                    match: { type: editor.getType(KEYS.link) },
                  });
                  setLinkUrl(entry ? String(entry[0].url ?? '') : '');
                  setLinkError('');
                  setLinkOpen(true);
                }}
              >
                <Link />
              </ToolbarButton>
              {enabled.table && <TableMenu />}
            </ToolbarGroup>
            {canCreateAssets && enabled.media && (
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
            </ToolbarGroup>
          </>
          <ToolbarGroup>
            <CommentToolbarActions />
          </ToolbarGroup>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
          {right}
          <WidgetSettingsDialog />
        </div>
      </div>
      <Dialog
        open={linkOpen}
        onOpenChange={(open) => {
          setLinkOpen(open);
          if (!open) {
            setLinkUrl('');
            setLinkError('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>Insert link</DialogTitle>
          <label className="flex flex-col gap-1.5">
            <InputTitle>Link URL</InputTitle>
            <Input
              autoFocus
              value={linkUrl}
              aria-invalid={Boolean(linkError)}
              onChange={(event) => {
                setLinkUrl(event.target.value);
                setLinkError('');
              }}
              placeholder="https://example.com"
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyLink();
              }}
            />
            <InputError>{linkError}</InputError>
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

const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 96;
const FONT_SIZE_PRESETS = [8, 9, 10, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72, 96] as const;
const BLOCK_FONT_SIZES: Record<string, number> = {
  [KEYS.h1]: 36,
  [KEYS.h2]: 24,
  [KEYS.h3]: 20,
  [KEYS.h4]: 18,
  [KEYS.h5]: 18,
  [KEYS.h6]: 16,
};

function clampFontSize(size: number) {
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size));
}

function FontSizeControl() {
  const [open, setOpen] = useState(false);
  const { editor, tf } = useEditorPlugin(FontSizePlugin);
  const cursorFontSize = useEditorSelector((currentEditor) => {
    const markedSize = currentEditor.api.marks()?.[KEYS.fontSize];

    if (markedSize != null) {
      const parsedSize = Number.parseFloat(toUnitLess(String(markedSize)));
      if (Number.isFinite(parsedSize)) return clampFontSize(parsedSize);
    }

    const [block] = currentEditor.api.block() ?? [];
    return (block?.type && BLOCK_FONT_SIZES[String(block.type)]) || DEFAULT_FONT_SIZE;
  }, []);

  const setFontSize = (size: number, closePopover = false) => {
    tf.fontSize.addMark(`${clampFontSize(size)}px`);
    if (closePopover) setOpen(false);
    editor.tf.focus();
  };

  return (
    <div role="group" className="mr-1 flex items-center overflow-hidden" aria-label="Font size">
      <ToolbarButton
        label="Decrease font size"
        className="rounded-r-none bg-surface-hover-bg p-0 text-surface-dark-fg hover:bg-surface-dark"
        disabled={cursorFontSize <= MIN_FONT_SIZE}
        onClick={() => setFontSize(cursorFontSize - 1)}
      >
        <Minus />
      </ToolbarButton>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-plate-prevent-deselect
            aria-label={`Font size: ${cursorFontSize}`}
            aria-haspopup="listbox"
            aria-expanded={open}
            title="Choose font size"
            onMouseDown={(event) => event.preventDefault()}
            className={cn(
              'h-8 w-10 shrink-0 text-center text-sm font-semibold outline-none',
              'focus-visible:ring-focus bg-surface-hover-bg text-surface-dark-fg hover:bg-surface-dark focus-visible:ring-2'
            )}
          >
            {cursorFontSize}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          className="max-h-64 w-14 gap-0 overflow-y-auto border border-line bg-surface p-1 shadow-pop"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            editor.tf.focus();
          }}
        >
          <div role="listbox" aria-label="Font sizes">
            {FONT_SIZE_PRESETS.map((size) => (
              <button
                key={size}
                type="button"
                role="option"
                aria-selected={size === cursorFontSize}
                data-plate-prevent-deselect
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setFontSize(size, true)}
                className={cn(
                  'flex h-8 w-full items-center justify-center rounded-row text-sm outline-none',
                  'focus-visible:ring-focus hover:bg-surface-hover-bg focus-visible:ring-2',
                  size === cursorFontSize && 'bg-tint-accent-1 text-tint-accent-1-fg'
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <ToolbarButton
        label="Increase font size"
        className="rounded-l-none bg-surface-hover-bg p-0 text-surface-dark-fg hover:bg-surface-dark"
        disabled={cursorFontSize >= MAX_FONT_SIZE}
        onClick={() => setFontSize(cursorFontSize + 1)}
      >
        <Plus />
      </ToolbarButton>
    </div>
  );
}

function FontColorControl({
  label,
  markKey,
  icon,
  fallbackColor,
}: {
  label: string;
  markKey: string;
  icon: React.ReactNode;
  fallbackColor: string;
}) {
  const editor = useEditorRef() as AnyEditor;
  const [open, setOpen] = useState(false);
  const currentColor = useEditorSelector(
    (currentEditor) => currentEditor.api.mark(markKey) as string | undefined,
    [markKey]
  );

  const applyColor = (color: string) => {
    editor.tf.addMarks({ [markKey]: color });
    setOpen(false);
  };

  const clearColor = () => {
    editor.tf.removeMarks(markKey);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton label={label} active={Boolean(currentColor)} className="relative">
          {icon}
          <span
            aria-hidden
            className="absolute right-1.5 bottom-0.5 left-1.5 h-1 rounded-pill border border-line-strong"
            style={{ backgroundColor: currentColor || fallbackColor }}
          />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-64 border border-line bg-surface p-2.5 shadow-pop"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          editor.tf.focus();
        }}
      >
        <ColorPicker value={currentColor} onChange={applyColor} onClear={clearColor} />
      </PopoverContent>
    </Popover>
  );
}

// TODO: reflect text block style in the trigger value
function BlockTypeMenu({ onBlock }: { onBlock: (type: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton label="Block Type" className="w-fit">
          <span className="translate-y-px">Paragraph</span>
          <ChevronDown className="size-3! text-fg-secondary" />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-42 gap-0.5 bg-surface p-1 shadow-pop">
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

type ImportKind = 'markdown' | 'docx' | 'json';

const IMPORT_OPTIONS: Record<
  ImportKind,
  { accept: string; extensions: string[]; maxBytes: number }
> = {
  markdown: {
    accept: '.md,.mdx,text/markdown,text/mdx',
    extensions: ['.md', '.mdx'],
    maxBytes: 5 * 1024 * 1024,
  },
  docx: {
    accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extensions: ['.docx'],
    maxBytes: 25 * 1024 * 1024,
  },
  json: {
    accept: '.json,.plate.json,application/json',
    extensions: ['.json'],
    maxBytes: 10 * 1024 * 1024,
  },
};

function validateImportFile(file: File, kind: ImportKind) {
  const option = IMPORT_OPTIONS[kind];
  const name = file.name.toLowerCase();

  if (!option.extensions.some((extension) => name.endsWith(extension))) {
    throw new Error(`Choose a ${option.extensions.join(' or ')} file.`);
  }
  if (file.size === 0) {
    throw new Error('The selected file is empty.');
  }
  if (file.size > option.maxBytes) {
    throw new Error(`The selected file is larger than ${option.maxBytes / 1024 / 1024} MB.`);
  }
}

function ImportMenu({
  importFile,
}: {
  importFile: (file: File, kind: ImportKind) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const markdownInput = useRef<HTMLInputElement>(null);
  const docxInput = useRef<HTMLInputElement>(null);
  const jsonInput = useRef<HTMLInputElement>(null);
  const inputRefs = {
    markdown: markdownInput,
    docx: docxInput,
    json: jsonInput,
  } satisfies Record<ImportKind, React.RefObject<HTMLInputElement | null>>;

  const chooseFile = (kind: ImportKind) => {
    setOpen(false);
    inputRefs[kind].current?.click();
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>, kind: ImportKind) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      validateImportFile(file, kind);
      await importFile(file, kind);
    } catch (cause) {
      userToast({
        title: 'Import failed',
        description:
          cause instanceof Error ? cause.message : 'The selected file could not be read.',
      });
    }
  };

  return (
    <>
      {(Object.keys(IMPORT_OPTIONS) as ImportKind[]).map((kind) => (
        <input
          key={kind}
          ref={inputRefs[kind]}
          type="file"
          className="hidden"
          accept={IMPORT_OPTIONS[kind].accept}
          onChange={(event) => void handleFile(event, kind)}
        />
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <ToolbarButton label="Import document" className="w-fit">
            <ArrowUpFromLine />
            <ChevronDown className="size-3! text-fg-secondary" />
          </ToolbarButton>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-52 gap-0.5 border border-line bg-surface p-1 shadow-pop"
        >
          <MenuRow label="Import Markdown (.md)" onClick={() => chooseFile('markdown')} />
          <MenuRow label="Import Word (.docx)" onClick={() => chooseFile('docx')} />
          <MenuRow label="Import JSON" onClick={() => chooseFile('json')} />
        </PopoverContent>
      </Popover>
    </>
  );
}

function ExportMenu({ editor }: { editor: AnyEditor }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton label="Export document" className="w-fit">
          <ArrowDownToLine />
          <ChevronDown className="size-3! text-fg-secondary" />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-52 gap-0.5 border border-line bg-surface p-1 shadow-pop"
      >
        <MenuRow
          label="Export Markdown (.md)"
          onClick={() =>
            downloadEditorText(exportMarkdownDocument(editor), 'document.md', 'text/markdown')
          }
        />
        <MenuRow
          label="Export Word (.docx)"
          onClick={() =>
            void exportDocxDocument(editor, MaterialKit as SlatePlugin[]).then((blob) =>
              downloadEditorFile(blob, 'document.docx')
            )
          }
        />
        <MenuRow
          label="Export JSON"
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
  );
}

// TODO: change this to toggle mode and remove justify
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

function TableMenu() {
  const [open, setOpen] = useState(false);
  const { editor, tf } = useEditorPlugin(TablePlugin);
  const tableSelected = useEditorSelector(
    (currentEditor) => currentEditor.api.some({ match: { type: KEYS.table } }),
    []
  );
  const { canMerge, canSplit } = useTableMergeState();

  const run = (action: () => void) => {
    action();
    editor.tf.focus();
  };

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton label="Table controls" active={open}>
          <Table2 />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-45">
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Grid3X3 />
              <span>Table</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-auto p-0">
              <TablePicker
                onInsert={(rowCount, colCount) => {
                  run(() => tf.insert.table({ rowCount, colCount }, { select: true }));
                  setOpen(false);
                }}
              />
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!tableSelected}>
              <span className="size-4" />
              <span>Cell</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              <DropdownMenuItem disabled={!canMerge} onSelect={() => run(() => tf.table.merge())}>
                <Combine />
                Merge cells
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canSplit} onSelect={() => run(() => tf.table.split())}>
                <Ungroup />
                Split cell
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!tableSelected}>
              <span className="size-4" />
              <span>Row</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              <DropdownMenuItem onSelect={() => run(() => tf.insert.tableRow({ before: true }))}>
                <ArrowUp />
                Insert row before
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => run(() => tf.insert.tableRow())}>
                <ArrowDown />
                Insert row after
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => run(() => tf.remove.tableRow())}>
                <X />
                Delete row
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!tableSelected}>
              <span className="size-4" />
              <span>Column</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-52">
              <DropdownMenuItem onSelect={() => run(() => tf.insert.tableColumn({ before: true }))}>
                <ArrowLeft />
                Insert column before
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => run(() => tf.insert.tableColumn())}>
                <ArrowRight />
                Insert column after
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => run(() => tf.remove.tableColumn())}>
                <X />
                Delete column
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem disabled={!tableSelected} onSelect={() => run(() => tf.remove.table())}>
            <Trash2 />
            Delete table
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TablePicker({ onInsert }: { onInsert: (rowCount: number, colCount: number) => void }) {
  const [size, setSize] = useState({ rowCount: 3, colCount: 3 });
  const dimension = 8;

  return (
    <div
      role="grid"
      tabIndex={0}
      aria-label={`Insert ${size.rowCount} by ${size.colCount} table`}
      className="m-0 flex flex-col gap-1 p-1 outline-none"
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onInsert(size.rowCount, size.colCount);
          return;
        }

        const next = { ...size };
        if (event.key === 'ArrowUp') next.rowCount = Math.max(1, size.rowCount - 1);
        else if (event.key === 'ArrowDown') next.rowCount = Math.min(dimension, size.rowCount + 1);
        else if (event.key === 'ArrowLeft') next.colCount = Math.max(1, size.colCount - 1);
        else if (event.key === 'ArrowRight') next.colCount = Math.min(dimension, size.colCount + 1);
        else return;

        event.preventDefault();
        setSize(next);
      }}
    >
      <div className="grid size-32 grid-cols-8 gap-0.5">
        {Array.from({ length: dimension * dimension }, (_, index) => {
          const row = Math.floor(index / dimension) + 1;
          const column = (index % dimension) + 1;
          const active = row <= size.rowCount && column <= size.colCount;

          return (
            <button
              key={`${row}:${column}`}
              type="button"
              role="gridcell"
              tabIndex={-1}
              aria-label={`Insert ${row} by ${column} table`}
              aria-selected={active}
              className={cn(
                'size-3.5 rounded-xs border border-line bg-surface outline-none',
                active && 'border-action-accent bg-tint-accent-1'
              )}
              onPointerEnter={() => setSize({ rowCount: row, colCount: column })}
              onFocus={() => setSize({ rowCount: row, colCount: column })}
              onClick={() => onInsert(row, column)}
            />
          );
        })}
      </div>
      <div className="text-center text-xs text-fg-secondary">
        {size.rowCount} × {size.colCount}
      </div>
    </div>
  );
}

function MenuRow({
  label,
  onClick,
  icon,
  className,
  ...rest
}: React.ComponentProps<'button'> & {
  label: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2 rounded-row px-2 py-1.5 text-left text-sm text-fg hover:bg-surface-hover-bg [&_svg]:size-4',
        className
      )}
      onClick={onClick}
      {...rest}
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
