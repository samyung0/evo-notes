/* Static (read-only) note document components. Rendered by PlateStatic without
 * a Plate store: no Plate hooks, no editor transforms, no edit affordances.
 * Styling is shared with the editable components via nodeStyles. */
import type { CSSProperties, MouseEvent } from 'react';
import { getTableColumnCount } from '@platejs/table';
import { CircleAlert, CircleCheck, CircleX, Info } from 'lucide-react';
import { KEYS, NodeApi, type Path, type TTableElement } from 'platejs';
import {
  SlateElement,
  SlateLeaf,
  type SlateElementProps,
  type SlateLeafProps,
} from 'platejs/static';
import { cn } from '@/lib/cn';
import { Katex } from './Katex';
import { MediaAssetView, type MediaAssetNode } from './MediaAssetView';
import { Mermaid } from './Mermaid';
import {
  QuizOptionView,
  QuizQuestionHeader,
  quizOptionClassName,
  type QuizOptionRole,
} from './QuizBlock';
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
  QUIZ_REVIEW_PROMPT_CLASS,
  QUIZ_REVIEW_QUESTION_CLASS,
  STUDY_BLOCK_LIST_CLASS,
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
import {
  CALLOUT_VARIANT_CLASS,
  getCodeBlockLanguageLabel,
  normalizeCalloutVariant,
  type CalloutVariant,
} from '@/features/notes/richBlockConfig';

/* ------------------------------------------------------------- helpers */

function element(as: keyof HTMLElementTagNameMap | undefined, className?: string) {
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

function CodeBlock(props: SlateElementProps) {
  const language = (props.element as { lang?: unknown }).lang;
  return (
    <SlateElement
      {...props}
      as="pre"
      className={cn(CODE_BLOCK_CLASS, !(typeof language === 'string' && language) && 'pt-3')}
    >
      {typeof language === 'string' && language && (
        <span className="absolute top-2 right-2 font-sans text-[11px] text-fg-muted">
          {getCodeBlockLanguageLabel(language)}
        </span>
      )}
      {props.children}
    </SlateElement>
  );
}

function LinkElement(props: SlateElementProps) {
  return (
    <SlateElement
      {...props}
      as="a"
      className={LINK_CLASS}
      attributes={
        {
          ...props.attributes,
          target: '_blank',
          rel: 'noopener noreferrer',
        } as SlateElementProps['attributes']
      }
    >
      {props.children}
    </SlateElement>
  );
}

function Table(props: SlateElementProps) {
  const table = props.element as TTableElement;
  const colSizes = Array.from(
    { length: getTableColumnCount(table) },
    (_, index) => table.colSizes?.[index] || 120
  );

  return (
    <SlateElement {...props} className={TABLE_WRAP_CLASS}>
      <table
        className={cn(TABLE_CLASS, 'table-fixed')}
        style={{ width: colSizes.reduce((total, width) => total + width, 0) }}
      >
        <colgroup>
          {colSizes.map((width, index) => (
            <col key={index} style={{ width }} />
          ))}
        </colgroup>
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
      style={width ? ({ '--column-width': width } as CSSProperties) : undefined}
    >
      {props.children}
    </SlateElement>
  );
}

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

function Callout(props: SlateElementProps) {
  const variant = normalizeCalloutVariant((props.element as { variant?: unknown }).variant);
  return (
    <SlateElement
      {...props}
      className={cn(CALLOUT_CLASS, CALLOUT_VARIANT_CLASS[variant])}
      data-callout-variant={variant}
    >
      <CalloutIcon variant={variant} />
      <div className="min-w-0 flex-1 text-fg">{props.children}</div>
    </SlateElement>
  );
}

/* toc — scrolls the preview instead of moving an editor selection */
function scrollToHeading(event: MouseEvent, headingOrder: number) {
  const root = (event.currentTarget as HTMLElement).closest('[data-slate-editor]');
  if (!root) return;
  const heads = root.querySelectorAll(
    ':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6'
  );
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

function CodeSyntax(props: SlateLeafProps) {
  const tokenClassName = props.leaf.className as string | undefined;

  return (
    <SlateLeaf {...props} as="span" className={tokenClassName}>
      {props.children}
    </SlateLeaf>
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
  return (
    <SlateElement {...props} className={STUDY_BLOCK_LIST_CLASS}>
      {props.children}
    </SlateElement>
  );
}

function FlashcardsElement(props: SlateElementProps) {
  return (
    <SlateElement {...props} className={cn(STUDY_BLOCK_LIST_CLASS, 'gap-2')}>
      {props.children}
    </SlateElement>
  );
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
  const path = (props as { path?: Path }).path;
  const pathIndex = path?.[path.length - 1];
  const questionNumber = typeof pathIndex === 'number' ? pathIndex + 1 : undefined;
  return (
    <SlateElement {...props} className={QUIZ_REVIEW_QUESTION_CLASS}>
      <QuizQuestionHeader
        questionNumber={questionNumber}
        questionType={element.questionType}
        level={element.level}
      />
      {props.children}
    </SlateElement>
  );
}

function QuizPromptElement(props: SlateElementProps) {
  return (
    <SlateElement {...props} as="p" className={QUIZ_REVIEW_PROMPT_CLASS}>
      {props.children}
    </SlateElement>
  );
}

function QuizOptionElement(props: SlateElementProps) {
  const element = props.element as unknown as QuizOptionNode & {
    explanation?: string;
    role?: QuizOptionRole;
  };
  const path = (props as { path?: Path }).path;
  const parent = path?.length ? NodeApi.get(props.editor, path.slice(0, -1)) : undefined;
  const question = parent?.type === 'quiz_question' ? (parent as QuizQuestionNode) : undefined;
  const correct = question?.correctOptionIds?.includes(element.id);
  const pathIndex = path?.[path.length - 1];
  const optionNumber = typeof pathIndex === 'number' ? pathIndex : undefined;

  return (
    <SlateElement {...props} className={quizOptionClassName(Boolean(correct), element.role)}>
      <QuizOptionView
        correct={Boolean(correct)}
        role={element.role}
        optionNumber={optionNumber}
        explanation={element.explanation}
      >
        {props.children}
      </QuizOptionView>
    </SlateElement>
  );
}

function QuizExplanationElement(props: SlateElementProps) {
  return (
    <SlateElement {...props} as="p" className={cn('col-span-2', QUIZ_EXPLANATION_CLASS)}>
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
  code_block: CodeBlock,
  code_line: element(undefined),
  code_syntax: CodeSyntax,
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
  callout: Callout,
  column_group: element('div', COLUMN_GROUP_CLASS),
  column: Column,
  toc: Toc,
  mention: Mention,
  equation: BlockEquation,
  inline_equation: InlineEquation,
  /* study blocks */
  quiz: QuizElement,
  quiz_question: QuizQuestionElement,
  quiz_prompt: QuizPromptElement,
  quiz_option: QuizOptionElement,
  quiz_explanation: QuizExplanationElement,
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
