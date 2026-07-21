import {
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useLink } from '@platejs/link/react';
import { useTocElement, useTocElementState } from '@platejs/toc/react';
import type { TLinkElement } from 'platejs';
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
  TableCellElement,
  TableCellHeaderElement,
  TableElement,
  TableRowElement,
} from './TableNodes';

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
  const state = useTocElementState();
  const { props: tocProps } = useTocElement(state);
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
                onClick={(event) => tocProps.onClick(event, heading, 'smooth')}
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
