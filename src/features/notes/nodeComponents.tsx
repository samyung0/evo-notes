import katex from 'katex';
import 'katex/dist/katex.min.css';
import { NodeApi, KEYS } from 'platejs';
import {
  PlateElement,
  PlateLeaf,
  type PlateElementProps,
  type PlateLeafProps,
  useEditorRef,
} from 'platejs/react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { MediaAssetElement } from './MediaNodes';
import { EmojiInputElement } from './EmojiInput';
import { MentionInputElement } from './MentionInput';

/* ------------------------------------------------------------- block elements */

const HEADING_CLASS: Record<string, string> = {
  h1: 'mt-6 mb-3 text-2xl font-bold text-fg',
  h2: 'mt-5 mb-2.5 text-xl font-bold text-fg',
  h3: 'mt-4 mb-2 text-lg font-semibold text-fg',
  h4: 'mt-3 mb-2 text-base font-semibold text-fg',
  h5: 'mt-3 mb-1.5 text-sm font-semibold text-fg',
  h6: 'mt-3 mb-1.5 text-xs font-semibold tracking-wide text-fg-muted uppercase',
};

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
  return (
    <PlateElement {...props} as="p" className="my-2 leading-relaxed text-fg">
      {props.children}
    </PlateElement>
  );
}

function Blockquote(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="blockquote"
      className="my-3 border-l-2 border-line-strong pl-4 text-fg-secondary italic"
    >
      {props.children}
    </PlateElement>
  );
}

function Hr(props: PlateElementProps) {
  return (
    <PlateElement {...props}>
      <div contentEditable={false}>
        <hr className="my-5 border-divider" />
      </div>
      {props.children}
    </PlateElement>
  );
}

function CodeBlock(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="pre"
      className="my-3 overflow-auto rounded-card border border-line bg-surface-hover-bg p-3 font-mono text-xs text-fg"
    >
      {props.children}
    </PlateElement>
  );
}
function CodeLine(props: PlateElementProps) {
  return <PlateElement {...props}>{props.children}</PlateElement>;
}

function LinkElement(props: PlateElementProps) {
  const url = String((props.element as { url?: string }).url ?? '#');
  return (
    <PlateElement
      {...props}
      as="a"
      className="text-action-accent underline underline-offset-2"
      attributes={{ ...props.attributes, href: url } as PlateElementProps['attributes']}
    >
      {props.children}
    </PlateElement>
  );
}

/* lists */
function Ul(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="ul" className="my-2 ml-5 list-disc space-y-1">
      {props.children}
    </PlateElement>
  );
}
function Ol(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="ol" className="my-2 ml-5 list-decimal space-y-1">
      {props.children}
    </PlateElement>
  );
}
function Li(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="li" className="text-fg">
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

/* tables */
function Table(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="div" className="my-3 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <tbody>{props.children}</tbody>
      </table>
    </PlateElement>
  );
}
function Tr(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="tr">
      {props.children}
    </PlateElement>
  );
}
function Td(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="td" className="border border-line px-3 py-1.5 align-top">
      {props.children}
    </PlateElement>
  );
}
function Th(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="th"
      className="border border-line bg-surface-hover-bg px-3 py-1.5 text-left font-semibold"
    >
      {props.children}
    </PlateElement>
  );
}

/* callout */
function Callout(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      className="my-3 rounded-card border border-line bg-surface-hover-bg p-3 text-fg"
    >
      {props.children}
    </PlateElement>
  );
}

/* columns */
function ColumnGroup(props: PlateElementProps) {
  return (
    <PlateElement {...props} className="my-3 flex flex-col gap-3 sm:flex-row">
      {props.children}
    </PlateElement>
  );
}
function Column(props: PlateElementProps) {
  const width = (props.element as { width?: string }).width;
  return (
    <PlateElement
      {...props}
      className="min-w-0 flex-1"
      style={width ? { flexBasis: width } : undefined}
    >
      {props.children}
    </PlateElement>
  );
}

/* toc — read-only outline placeholder (headings are the source of truth) */
function Toc(props: PlateElementProps) {
  const editor = useEditorRef();
  const headings = editor.children
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => KEYS.heading.includes(node.type as (typeof KEYS.heading)[number]));
  return (
    <PlateElement {...props}>
      <div
        contentEditable={false}
        className="my-3 rounded-card border border-line bg-surface-hover-bg p-3"
      >
        <p className="mb-2 text-xs font-semibold tracking-wide text-fg-muted uppercase">
          Table of contents
        </p>
        {headings.length ? (
          <nav className="flex flex-col">
            {headings.map(({ node, index }) => (
              <button
                key={(node.id as string | undefined) ?? index}
                type="button"
                className="rounded-row px-2 py-1 text-left text-sm text-fg-secondary hover:bg-surface"
                style={{ paddingLeft: `${8 + Math.max(0, Number(node.type.slice(1)) - 1) * 12}px` }}
                onClick={() => {
                  editor.tf.select([index, 0]);
                  editor.tf.focus();
                }}
              >
                {NodeApi.string(node)}
              </button>
            ))}
          </nav>
        ) : (
          <p className="text-sm text-fg-muted">Add headings to build this outline.</p>
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
    <PlateElement
      {...props}
      as="span"
      className="rounded bg-tint-accent-1 px-1 text-tint-accent-1-fg"
    >
      <span contentEditable={false}>@{value}</span>
      {props.children}
    </PlateElement>
  );
}

/* date (inline void) */
function DateElement(props: PlateElementProps) {
  const date = String((props.element as { date?: string }).date ?? '');
  return (
    <PlateElement
      {...props}
      as="span"
      className="rounded bg-surface-hover-bg px-1 text-fg-secondary"
    >
      <span contentEditable={false}>{date || 'date'}</span>
      {props.children}
    </PlateElement>
  );
}

function ToggleElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const open = Boolean((props.element as { open?: boolean }).open);
  return (
    <PlateElement {...props} className="my-2 rounded-card border border-line bg-surface">
      <div className="flex items-start gap-1">
        <button
          type="button"
          contentEditable={false}
          aria-label={open ? 'Collapse toggle' : 'Expand toggle'}
          aria-expanded={open}
          className="mt-2 rounded-row p-1 text-fg-muted hover:bg-surface-hover-bg"
          onClick={() => {
            const at = editor.api.findPath(props.element);
            if (at) editor.tf.setNodes({ open: !open }, { at });
          }}
        >
          <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
        </button>
        <div className={cn('min-w-0 flex-1 px-1', !open && 'line-clamp-1')}>{props.children}</div>
      </div>
    </PlateElement>
  );
}

/* math (KaTeX). Click to edit the TeX via prompt. */
function renderKatex(tex: string, displayMode: boolean): { __html: string } {
  try {
    return { __html: katex.renderToString(tex || '', { displayMode, throwOnError: false }) };
  } catch {
    return { __html: tex };
  }
}

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
        className="my-3 cursor-pointer overflow-auto rounded-card border border-line p-3 text-center"
        dangerouslySetInnerHTML={renderKatex(tex, true)}
      />
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
      <span
        contentEditable={false}
        onClick={edit}
        className="cursor-pointer"
        dangerouslySetInnerHTML={renderKatex(tex, false)}
      />
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

const Code = mark('code', 'rounded bg-surface-hover-bg px-1 py-0.5 font-mono text-[0.85em]');
const Highlight = mark('mark', 'bg-tint-accent-2 text-tint-accent-2-fg');
const CodeSyntax = mark('span');
const Kbd = mark(
  'kbd',
  'rounded border border-line bg-surface-hover-bg px-1 font-mono text-[0.8em] text-fg'
);

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
  table: Table,
  tr: Tr,
  td: Td,
  th: Th,
  callout: Callout,
  column_group: ColumnGroup,
  column: Column,
  toc: Toc,
  toggle: ToggleElement,
  mention: Mention,
  mention_input: MentionInputElement,
  emoji_input: EmojiInputElement,
  date: DateElement,
  equation: BlockEquation,
  inline_equation: InlineEquation,
  bold: mark('strong', 'font-semibold'),
  italic: mark('em', 'italic'),
  underline: mark('u'),
  strikethrough: mark('s'),
  code: Code,
  highlight: Highlight,
  subscript: mark('sub'),
  superscript: mark('sup'),
  kbd: Kbd,
} as const;
