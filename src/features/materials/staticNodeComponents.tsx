/* Static (read-only) note document components. Rendered by PlateStatic without
 * a Plate store: no Plate hooks, no editor transforms, no edit affordances.
 * Styling is shared with the editable components via nodeStyles. */
import type { MouseEvent } from 'react';
import { KEYS, NodeApi, type Path } from 'platejs';
import {
  SlateElement,
  SlateLeaf,
  type SlateElementProps,
  type SlateLeafProps,
} from 'platejs/static';
import { Katex } from './Katex';
import { MediaAssetView, type MediaAssetNode } from './MediaAssetView';
import { Mermaid } from './Mermaid';
import type {
  FlashcardElement as FlashcardNode,
  MermaidElement as MermaidNode,
  QuizQuestionElement as QuizQuestionNode,
  QuizOptionElement as QuizOptionNode,
} from './document';
import {
  BLOCKQUOTE_CLASS,
  BLOCK_SHELL_CLASS,
  BOLD_MARK_CLASS,
  CALLOUT_CLASS,
  CODE_BLOCK_CLASS,
  CODE_MARK_CLASS,
  COLUMN_CLASS,
  COLUMN_GROUP_CLASS,
  DATE_CLASS,
  EQUATION_BLOCK_CLASS,
  FLASHCARD_BACK_CLASS,
  FLASHCARD_CLASS,
  FLASHCARD_FRONT_CLASS,
  HEADING_CLASS,
  HIGHLIGHT_MARK_CLASS,
  HR_CLASS,
  ITALIC_MARK_CLASS,
  KBD_MARK_CLASS,
  LINK_CLASS,
  LI_CLASS,
  MENTION_CLASS,
  MERMAID_CAPTION_CLASS,
  OL_CLASS,
  PARAGRAPH_CLASS,
  QUIZ_EXPLANATION_CLASS,
  QUIZ_OPTION_CLASS,
  QUIZ_PROMPT_CLASS,
  QUIZ_QUESTION_CLASS,
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
} from '@/features/notes/nodeStyles';

/* ------------------------------------------------------------- helpers */

function element(
  as: keyof HTMLElementTagNameMap | undefined,
  className?: string
) {
  return function StaticEl(props: SlateElementProps) {
    return (
      <SlateElement {...props} as={as} className={className}>
        {props.children}
      </SlateElement>
    );
  };
}

function mark(as: keyof HTMLElementTagNameMap, className?: string) {
  return function StaticMark(props: SlateLeafProps) {
    return (
      <SlateLeaf {...props} as={as} className={className}>
        {props.children}
      </SlateLeaf>
    );
  };
}

/* ------------------------------------------------------------- elements */

function Hr(props: SlateElementProps) {
  return (
    <SlateElement {...props}>
      <hr className={HR_CLASS} />
      {props.children}
    </SlateElement>
  );
}

function LinkElement(props: SlateElementProps) {
  const url = String((props.element as { url?: string }).url ?? '#');
  return (
    <SlateElement
      {...props}
      as="a"
      className={LINK_CLASS}
      attributes={
        {
          ...props.attributes,
          href: url,
          target: '_blank',
          rel: 'noreferrer',
        } as SlateElementProps['attributes']
      }
    >
      {props.children}
    </SlateElement>
  );
}

function Table(props: SlateElementProps) {
  return (
    <SlateElement {...props} className={TABLE_WRAP_CLASS}>
      <table className={TABLE_CLASS}>
        <tbody>{props.children}</tbody>
      </table>
    </SlateElement>
  );
}

function Column(props: SlateElementProps) {
  const width = (props.element as { width?: string }).width;
  return (
    <SlateElement
      {...props}
      className={COLUMN_CLASS}
      style={width ? { flexBasis: width } : undefined}
    >
      {props.children}
    </SlateElement>
  );
}

/* toc — scrolls the preview instead of moving an editor selection */
function scrollToHeading(event: MouseEvent, headingOrder: number) {
  const root = (event.currentTarget as HTMLElement).closest('[data-slate-editor]');
  if (!root) return;
  const heads = root.querySelectorAll(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6');
  heads[headingOrder]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Toc(props: SlateElementProps) {
  const headings = props.editor.children.filter((node) =>
    KEYS.heading.includes(node.type as (typeof KEYS.heading)[number])
  );
  return (
    <SlateElement {...props}>
      <div className={TOC_BOX_CLASS}>
        <p className={TOC_TITLE_CLASS}>Table of contents</p>
        {headings.length ? (
          <nav className="flex flex-col">
            {headings.map((node, order) => (
              <button
                key={(node.id as string | undefined) ?? order}
                type="button"
                className={TOC_ITEM_CLASS}
                style={tocItemIndent(node.type as string)}
                onClick={(event) => scrollToHeading(event, order)}
              >
                {NodeApi.string(node)}
              </button>
            ))}
          </nav>
        ) : (
          <p className={TOC_EMPTY_CLASS}>No headings in this document.</p>
        )}
      </div>
      {props.children}
    </SlateElement>
  );
}

function Mention(props: SlateElementProps) {
  const value = String((props.element as { value?: string }).value ?? '');
  return (
    <SlateElement {...props} as="span" className={MENTION_CLASS}>
      <span>@{value}</span>
      {props.children}
    </SlateElement>
  );
}

function DateElement(props: SlateElementProps) {
  const date = String((props.element as { date?: string }).date ?? '');
  return (
    <SlateElement {...props} as="span" className={DATE_CLASS}>
      <span>{date || 'date'}</span>
      {props.children}
    </SlateElement>
  );
}

function BlockEquation(props: SlateElementProps) {
  const tex = String((props.element as { texExpression?: string }).texExpression ?? '');
  return (
    <SlateElement {...props}>
      <div className={EQUATION_BLOCK_CLASS}>
        <Katex tex={tex} displayMode />
      </div>
      {props.children}
    </SlateElement>
  );
}

function InlineEquation(props: SlateElementProps) {
  const tex = String((props.element as { texExpression?: string }).texExpression ?? '');
  return (
    <SlateElement {...props} as="span">
      <Katex tex={tex} displayMode={false} />
      {props.children}
    </SlateElement>
  );
}

function MediaAssetElement(props: SlateElementProps) {
  return (
    <SlateElement {...props} className="my-3">
      <MediaAssetView element={props.element as unknown as MediaAssetNode} />
      {props.children}
    </SlateElement>
  );
}

/* ------------------------------------------------------------- study blocks */

function BlockShell({
  props,
  label,
  children,
}: {
  props: SlateElementProps;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <SlateElement {...props} className={BLOCK_SHELL_CLASS}>
      <div className="mb-1 flex items-center justify-between">
        <span className="t-label text-fg-muted">{label}</span>
      </div>
      {children}
      {props.children}
    </SlateElement>
  );
}

function QuizElement(props: SlateElementProps) {
  const timeLimitMin = (props.element as { timeLimitMin?: number }).timeLimitMin;
  return (
    <BlockShell props={props} label="Quiz">
      {timeLimitMin != null && (
        <div className="mb-2 text-xs text-fg-muted">Time limit: {timeLimitMin} min</div>
      )}
    </BlockShell>
  );
}

function FlashcardsElement(props: SlateElementProps) {
  return <BlockShell props={props} label="Flashcards" />;
}

function MermaidElement(props: SlateElementProps) {
  const element = props.element as unknown as MermaidNode;
  return (
    <BlockShell props={props} label="Diagram">
      <Mermaid code={element.source} />
    </BlockShell>
  );
}

function QuizQuestionElement(props: SlateElementProps) {
  const element = props.element as unknown as QuizQuestionNode;
  return (
    <SlateElement {...props} className={QUIZ_QUESTION_CLASS}>
      <div className="mb-2 text-xs font-medium text-fg-muted">
        {element.questionType.toUpperCase()}
      </div>
      {props.children}
    </SlateElement>
  );
}

function QuizOptionElement(props: SlateElementProps) {
  const element = props.element as unknown as QuizOptionNode;
  const path = (props as { path?: Path }).path;
  const parent = path?.length ? NodeApi.get(props.editor, path.slice(0, -1)) : undefined;
  const question = parent?.type === 'quiz_question' ? (parent as QuizQuestionNode) : undefined;
  const correct = question?.correctOptionIds?.includes(element.id);
  return (
    <SlateElement {...props} as="p" className={QUIZ_OPTION_CLASS}>
      <span className="mr-2 text-xs text-fg-muted">{correct ? '✓' : '○'}</span>
      {props.children}
    </SlateElement>
  );
}

function FlashcardElement(props: SlateElementProps) {
  const element = props.element as unknown as FlashcardNode;
  return (
    <SlateElement {...props} className={FLASHCARD_CLASS} data-card-id={element.id}>
      {props.children}
    </SlateElement>
  );
}

/* ------------------------------------------------------------- components map */

export const staticNoteComponents = {
  h1: element('h1', HEADING_CLASS.h1),
  h2: element('h2', HEADING_CLASS.h2),
  h3: element('h3', HEADING_CLASS.h3),
  h4: element('h4', HEADING_CLASS.h4),
  h5: element('h5', HEADING_CLASS.h5),
  h6: element('h6', HEADING_CLASS.h6),
  p: element('p', PARAGRAPH_CLASS),
  blockquote: element('blockquote', BLOCKQUOTE_CLASS),
  hr: Hr,
  code_block: element('pre', CODE_BLOCK_CLASS),
  code_line: element(undefined),
  code_syntax: mark('span'),
  a: LinkElement,
  img: MediaAssetElement,
  video: MediaAssetElement,
  audio: MediaAssetElement,
  file: MediaAssetElement,
  ul: element('ul', UL_CLASS),
  ol: element('ol', OL_CLASS),
  li: element('li', LI_CLASS),
  lic: element('span'),
  table: Table,
  tr: element('tr'),
  td: element('td', TD_CLASS),
  th: element('th', TH_CLASS),
  callout: element('div', CALLOUT_CLASS),
  column_group: element('div', COLUMN_GROUP_CLASS),
  column: Column,
  toc: Toc,
  mention: Mention,
  date: DateElement,
  equation: BlockEquation,
  inline_equation: InlineEquation,
  /* study blocks */
  quiz: QuizElement,
  quiz_question: QuizQuestionElement,
  quiz_prompt: element('p', QUIZ_PROMPT_CLASS),
  quiz_option: QuizOptionElement,
  quiz_explanation: element('p', QUIZ_EXPLANATION_CLASS),
  flashcards: FlashcardsElement,
  flashcard: FlashcardElement,
  flashcard_front: element('p', FLASHCARD_FRONT_CLASS),
  flashcard_back: element('p', FLASHCARD_BACK_CLASS),
  mermaid: MermaidElement,
  mermaid_caption: element('p', MERMAID_CAPTION_CLASS),
  /* marks */
  bold: mark('strong', BOLD_MARK_CLASS),
  italic: mark('em', ITALIC_MARK_CLASS),
  underline: mark('u'),
  strikethrough: mark('s'),
  code: mark('code', CODE_MARK_CLASS),
  highlight: mark('mark', HIGHLIGHT_MARK_CLASS),
  subscript: mark('sub'),
  superscript: mark('sup'),
  kbd: mark('kbd', KBD_MARK_CLASS),
} as const;
