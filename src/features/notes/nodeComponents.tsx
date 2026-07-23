import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Katex } from '@/features/materials/Katex';
import { cn } from '@/lib/cn';
import { isOrderedList } from '@platejs/list';
import { useLink } from '@platejs/link/react';
import { useTocElementState } from '@platejs/toc/react';
import {
  Check,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clipboard,
  GripVertical,
  Info,
} from 'lucide-react';
import { KEYS, NodeApi, type TLinkElement } from 'platejs';
import {
  PlateElement,
  PlateLeaf,
  useEditorRef,
  useReadOnly,
  type PlateElementProps,
  type PlateLeafProps,
} from 'platejs/react';
import {
  useEffect,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Slot } from 'radix-ui';
import { Column, ColumnGroup } from './ColumnNodes';
import { MediaAssetElement } from './MediaNodes';
import { MentionInputElement } from './MentionInput';
import {
  BLOCKQUOTE_CLASS,
  BOLD_MARK_CLASS,
  CALLOUT_CLASS,
  CODE_BLOCK_CLASS,
  CODE_MARK_CLASS,
  EQUATION_BLOCK_CLASS,
  HEADING_CLASS,
  HIGHLIGHT_MARK_CLASS,
  HR_CLASS,
  ITALIC_MARK_CLASS,
  KBD_MARK_CLASS,
  LINK_CLASS,
  LI_CLASS,
  MENTION_CLASS,
  OL_CLASS,
  PARAGRAPH_CLASS,
  TOC_BOX_CLASS,
  TOC_EMPTY_CLASS,
  TOC_ITEM_CLASS,
  TOC_TITLE_CLASS,
  UL_CLASS,
  tocItemIndent,
} from './nodeStyles';
import {
  CALLOUT_VARIANTS,
  CALLOUT_VARIANT_CLASS,
  CODE_BLOCK_LANGUAGES,
  getCodeBlockLanguageLabel,
  normalizeCalloutVariant,
  type CalloutVariant,
} from './richBlockConfig';
import {
  TableCellElement,
  TableCellHeaderElement,
  TableElement,
  TableRowElement,
} from './TableNodes';

/* ------------------------------------------------------------- block elements */

export function FloatingActionButton({
  children,
  label,
  onClick,
  className,
  asChild = false,
  ...rest
}: React.ComponentProps<'button'> & {
  label: string;
  asChild?: boolean;
}) {
  const Component = asChild ? Slot.Root : 'button';

  return (
    <Component
      type={asChild ? undefined : 'button'}
      aria-label={label}
      title={label}
      data-plate-prevent-deselect
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'z-10 flex size-8 shrink-0 items-center justify-center rounded-row text-fg-muted outline-none hover:bg-surface-hover-bg hover:text-fg focus-visible:ring-2 focus-visible:ring-action active:cursor-grabbing [&_svg]:size-4',
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

function heading(tag: keyof HTMLElementTagNameMap, key: string) {
  return function Heading(props: PlateElementProps) {
    return (
      <PlateElement {...props} as={tag} className={HEADING_CLASS[key]}>
        {props.children}
      </PlateElement>
    );
  };
}

function Paragraph(props: PlateElementProps) {
  const element = props.element as { listStyleType?: string };
  const isNumberedList =
    element.listStyleType !== undefined &&
    element.listStyleType !== KEYS.listTodo &&
    isOrderedList(props.element);

  return (
    <PlateElement
      {...props}
      as="p"
      className={cn(PARAGRAPH_CLASS, isNumberedList && 'before:left-6')}
    >
      {props.children}
    </PlateElement>
  );
}

function Blockquote(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="blockquote" className={BLOCKQUOTE_CLASS}>
      {props.children}
    </PlateElement>
  );
}

function Hr(props: PlateElementProps) {
  return (
    <PlateElement {...props}>
      <div contentEditable={false}>
        <hr className={HR_CLASS} />
      </div>
      {props.children}
    </PlateElement>
  );
}

function CodeBlock(props: PlateElementProps) {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const [copied, setCopied] = useState(false);
  const language = String((props.element as { lang?: string }).lang || 'auto');

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(NodeApi.string(props.element));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <PlateElement {...props} as="pre" className={CODE_BLOCK_CLASS} data-language={language}>
      <div
        contentEditable={false}
        className="absolute top-1 right-1 z-10 flex h-7 items-center gap-0.5 font-sans"
      >
        {readOnly ? (
          <span className="px-2 text-[11px] text-fg-muted">
            {getCodeBlockLanguageLabel(language)}
          </span>
        ) : (
          <Select
            value={language}
            onValueChange={(value) => {
              const at = editor.api.findPath(props.element);
              if (at) editor.tf.setNodes({ lang: value }, { at });
            }}
          >
            <SelectTrigger
              aria-label="Code language"
              className="h-full w-auto translate-y-px bg-transparent py-0 pr-1.5 pl-2 font-semibold text-fg-muted hover:text-fg"
              size="sm"
              variant="noOutline"
              data-plate-prevent-deselect
              showDownIcon={false}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="max-h-72">
              {CODE_BLOCK_LANGUAGES.map((item) => (
                <SelectItem key={item.value} value={item.value} size="sm">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <button
          type="button"
          aria-label={copied ? 'Code copied' : 'Copy code'}
          title={copied ? 'Copied' : 'Copy code'}
          data-plate-prevent-deselect
          className="flex size-6 items-center justify-center rounded-md bg-transparent text-fg-muted hover:bg-line/50 hover:text-fg focus-visible:ring-2 focus-visible:ring-action"
          onClick={() => void copy()}
        >
          {copied ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}
        </button>
      </div>
      {props.children}
    </PlateElement>
  );
}
function CodeLine(props: PlateElementProps) {
  return <PlateElement {...props}>{props.children}</PlateElement>;
}

function LinkElement(props: PlateElementProps) {
  const [modifierDown, setModifierDown] = useState(false);
  const { props: linkProps } = useLink({ element: props.element as TLinkElement });
  const attributes = {
    ...props.attributes,
    rel: linkProps.target === '_blank' ? 'noopener noreferrer' : undefined,
    style: { cursor: modifierDown ? 'pointer' : 'text' },
    onBlur: (_event: FocusEvent<HTMLAnchorElement>) => setModifierDown(false),
    onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (!(event.ctrlKey || event.metaKey) || !linkProps.href) return;
      window.open(linkProps.href, '_blank', 'noopener,noreferrer');
    },
    onKeyDown: (event: KeyboardEvent<HTMLAnchorElement>) => {
      if (event.ctrlKey || event.metaKey) setModifierDown(true);
    },
    onKeyUp: (event: KeyboardEvent<HTMLAnchorElement>) => {
      if (!event.ctrlKey && !event.metaKey) setModifierDown(false);
    },
    onMouseEnter: (event: ReactMouseEvent<HTMLAnchorElement>) =>
      setModifierDown(event.ctrlKey || event.metaKey),
    onMouseLeave: () => setModifierDown(false),
    onMouseMove: (event: ReactMouseEvent<HTMLAnchorElement>) =>
      setModifierDown(event.ctrlKey || event.metaKey),
  } as PlateElementProps['attributes'];

  return (
    <PlateElement {...props} {...linkProps} as="a" className={LINK_CLASS} attributes={attributes}>
      {props.children}
    </PlateElement>
  );
}

/* lists */
function Ul(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="ul" className={UL_CLASS}>
      {props.children}
    </PlateElement>
  );
}
function Ol(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="ol" className={OL_CLASS}>
      {props.children}
    </PlateElement>
  );
}
function Li(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="li" className={LI_CLASS}>
      {props.children}
    </PlateElement>
  );
}
function Lic(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="span">
      {props.children}
    </PlateElement>
  );
}

/* callout */
function CalloutIcon({ variant }: { variant: CalloutVariant }) {
  const className = 'mt-0.5 size-5 shrink-0';
  switch (variant) {
    case 'success':
      return <CircleCheck aria-hidden className={className} />;
    case 'warning':
      return <CircleAlert aria-hidden className={className} />;
    case 'danger':
      return <CircleX aria-hidden className={className} />;
    default:
      return <Info aria-hidden className={className} />;
  }
}

function Callout(props: PlateElementProps) {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const variant = normalizeCalloutVariant((props.element as { variant?: unknown }).variant);

  return (
    <PlateElement
      {...props}
      className={cn(CALLOUT_CLASS, CALLOUT_VARIANT_CLASS[variant], !readOnly && 'pr-28')}
      data-callout-variant={variant}
    >
      <span contentEditable={false}>
        <CalloutIcon variant={variant} />
      </span>
      <div className="min-w-0 flex-1 text-fg">{props.children}</div>
      {!readOnly && (
        <div contentEditable={false} className="absolute top-2 right-2 rounded-row bg-surface/80">
          <Select
            value={variant}
            onValueChange={(value) => {
              const at = editor.api.findPath(props.element);
              if (at) editor.tf.setNodes({ variant: value }, { at });
            }}
          >
            <SelectTrigger
              aria-label="Callout style"
              className="h-7 w-24 bg-transparent px-2 py-0 text-xs"
              size="sm"
              variant="noOutline"
              data-plate-prevent-deselect
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {CALLOUT_VARIANTS.map((item) => (
                <SelectItem key={item.value} value={item.value} size="sm">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </PlateElement>
  );
}

/* toc — read-only outline placeholder (headings are the source of truth) */
const TOC_SCROLL_TOP_OFFSET = 36;

function scrollHeadingIntoView(element: HTMLElement, topOffset: number) {
  let scroller: HTMLElement | null = element.parentElement;
  while (scroller) {
    const { overflowY } = getComputedStyle(scroller);
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      scroller.scrollHeight > scroller.clientHeight
    ) {
      break;
    }
    scroller = scroller.parentElement;
  }

  if (!scroller) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const scrollerRect = scroller.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  scroller.scrollTo({
    behavior: 'smooth',
    top: scroller.scrollTop + (elementRect.top - scrollerRect.top) - topOffset,
  });
}

function Toc(props: PlateElementProps) {
  const state = useTocElementState();
  const headings = state.headingList;

  return (
    <PlateElement {...props}>
      <div contentEditable={false} className={TOC_BOX_CLASS}>
        <p className={TOC_TITLE_CLASS}>Table of contents</p>
        {headings.length ? (
          <nav className="flex flex-col">
            {headings.map((heading) => (
              <button
                key={heading.id ?? heading.path.join('-')}
                type="button"
                className={TOC_ITEM_CLASS}
                style={tocItemIndent(heading.type)}
                onClick={(event) => {
                  event.preventDefault();
                  const node = NodeApi.get(state.editor, heading.path);
                  if (!node) return;

                  const element = state.editor.api.toDOMNode(node);
                  if (!element) return;

                  scrollHeadingIntoView(element, TOC_SCROLL_TOP_OFFSET);
                  state.editor.tf.navigation.flashTarget({
                    target: { path: heading.path, type: 'node' },
                  });
                }}
              >
                {heading.title}
              </button>
            ))}
          </nav>
        ) : (
          <p className={TOC_EMPTY_CLASS}>Create a heading to display the table of contents.</p>
        )}
      </div>
      {props.children}
    </PlateElement>
  );
}

/* mention (inline void) */
function Mention(props: PlateElementProps) {
  const value = String((props.element as { value?: string }).value ?? '');
  return (
    <PlateElement {...props} as="span" className={MENTION_CLASS}>
      <span contentEditable={false}>@{value}</span>
      {props.children}
    </PlateElement>
  );
}

/* math (KaTeX, lazily loaded). Click to edit the TeX via prompt. */
function BlockEquation(props: PlateElementProps) {
  const editor = useEditorRef();
  const tex = String((props.element as { texExpression?: string }).texExpression ?? '');
  function edit() {
    const next = window.prompt('LaTeX expression', tex);
    if (next == null) return;
    const at = editor.api.findPath(props.element);
    if (at) editor.tf.setNodes({ texExpression: next } as object, { at });
  }
  return (
    <PlateElement {...props}>
      <div
        contentEditable={false}
        onClick={edit}
        className={`cursor-pointer ${EQUATION_BLOCK_CLASS}`}
      >
        <Katex tex={tex} displayMode />
      </div>
      {props.children}
    </PlateElement>
  );
}
function InlineEquation(props: PlateElementProps) {
  const editor = useEditorRef();
  const tex = String((props.element as { texExpression?: string }).texExpression ?? '');
  function edit() {
    const next = window.prompt('LaTeX expression', tex);
    if (next == null) return;
    const at = editor.api.findPath(props.element);
    if (at) editor.tf.setNodes({ texExpression: next } as object, { at });
  }
  return (
    <PlateElement {...props} as="span">
      <span contentEditable={false} onClick={edit} className="cursor-pointer">
        <Katex tex={tex} displayMode={false} />
      </span>
      {props.children}
    </PlateElement>
  );
}

/* ------------------------------------------------------------- leaf marks */

function mark(tag: keyof HTMLElementTagNameMap, className?: string) {
  return function Mark(props: PlateLeafProps) {
    return (
      <PlateLeaf {...props} as={tag} className={className}>
        {props.children}
      </PlateLeaf>
    );
  };
}

const Code = mark('code', CODE_MARK_CLASS);
const Highlight = mark('mark', HIGHLIGHT_MARK_CLASS);
const Kbd = mark('kbd', KBD_MARK_CLASS);

function CodeSyntax(props: PlateLeafProps) {
  const tokenClassName = props.leaf.className as string | undefined;

  return (
    <PlateLeaf {...props} as="span" className={tokenClassName}>
      {props.children}
    </PlateLeaf>
  );
}

/* ------------------------------------------------------------- components map */

export const noteComponents = {
  h1: heading('h1', 'h1'),
  h2: heading('h2', 'h2'),
  h3: heading('h3', 'h3'),
  h4: heading('h4', 'h4'),
  h5: heading('h5', 'h5'),
  h6: heading('h6', 'h6'),
  p: Paragraph,
  blockquote: Blockquote,
  hr: Hr,
  code_block: CodeBlock,
  code_line: CodeLine,
  code_syntax: CodeSyntax,
  a: LinkElement,
  img: MediaAssetElement,
  video: MediaAssetElement,
  audio: MediaAssetElement,
  file: MediaAssetElement,
  ul: Ul,
  ol: Ol,
  li: Li,
  lic: Lic,
  table: TableElement,
  tr: TableRowElement,
  td: TableCellElement,
  th: TableCellHeaderElement,
  callout: Callout,
  column_group: ColumnGroup,
  column: Column,
  toc: Toc,
  mention: Mention,
  mention_input: MentionInputElement,
  equation: BlockEquation,
  inline_equation: InlineEquation,
  bold: mark('strong', BOLD_MARK_CLASS),
  italic: mark('em', ITALIC_MARK_CLASS),
  underline: mark('u'),
  strikethrough: mark('s'),
  code: Code,
  highlight: Highlight,
  subscript: mark('sub'),
  superscript: mark('sup'),
  kbd: Kbd,
} as const;
