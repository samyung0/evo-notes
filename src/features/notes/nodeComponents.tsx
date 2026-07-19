import { NodeApi, KEYS } from 'platejs';
import {
  PlateElement,
  PlateLeaf,
  type PlateElementProps,
  type PlateLeafProps,
  useEditorRef,
} from 'platejs/react';
import { Katex } from '@/features/materials/Katex';
import { MediaAssetElement } from './MediaNodes';
import { MentionInputElement } from './MentionInput';
import {
  BLOCKQUOTE_CLASS,
  BOLD_MARK_CLASS,
  CALLOUT_CLASS,
  CODE_BLOCK_CLASS,
  CODE_MARK_CLASS,
  COLUMN_CLASS,
  COLUMN_GROUP_CLASS,
  DATE_CLASS,
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
  TABLE_CLASS,
  TABLE_WRAP_CLASS,
  TD_CLASS,
  TH_CLASS,
  TOC_BOX_CLASS,
  TOC_EMPTY_CLASS,
  TOC_ITEM_CLASS,
  TOC_TITLE_CLASS,
  UL_CLASS,
  tocItemIndent,
} from './nodeStyles';

/* ------------------------------------------------------------- block elements */

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
    <PlateElement {...props} as="p" className={PARAGRAPH_CLASS}>
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
  return (
    <PlateElement {...props} as="pre" className={CODE_BLOCK_CLASS}>
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
      className={LINK_CLASS}
      attributes={{ ...props.attributes, href: url } as PlateElementProps['attributes']}
    >
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

/* tables */
function Table(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="div" className={TABLE_WRAP_CLASS}>
      <table className={TABLE_CLASS}>
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
    <PlateElement {...props} as="td" className={TD_CLASS}>
      {props.children}
    </PlateElement>
  );
}
function Th(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="th" className={TH_CLASS}>
      {props.children}
    </PlateElement>
  );
}

/* callout */
function Callout(props: PlateElementProps) {
  return (
    <PlateElement {...props} className={CALLOUT_CLASS}>
      {props.children}
    </PlateElement>
  );
}

/* columns */
function ColumnGroup(props: PlateElementProps) {
  return (
    <PlateElement {...props} className={COLUMN_GROUP_CLASS}>
      {props.children}
    </PlateElement>
  );
}
function Column(props: PlateElementProps) {
  const width = (props.element as { width?: string }).width;
  return (
    <PlateElement
      {...props}
      className={COLUMN_CLASS}
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
      <div contentEditable={false} className={TOC_BOX_CLASS}>
        <p className={TOC_TITLE_CLASS}>Table of contents</p>
        {headings.length ? (
          <nav className="flex flex-col">
            {headings.map(({ node, index }) => (
              <button
                key={(node.id as string | undefined) ?? index}
                type="button"
                className={TOC_ITEM_CLASS}
                style={tocItemIndent(node.type)}
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
          <p className={TOC_EMPTY_CLASS}>Add headings to build this outline.</p>
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

/* date (inline void) */
function DateElement(props: PlateElementProps) {
  const date = String((props.element as { date?: string }).date ?? '');
  return (
    <PlateElement {...props} as="span" className={DATE_CLASS}>
      <span contentEditable={false}>{date || 'date'}</span>
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
const CodeSyntax = mark('span');
const Kbd = mark('kbd', KBD_MARK_CLASS);

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
  mention: Mention,
  mention_input: MentionInputElement,
  date: DateElement,
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
