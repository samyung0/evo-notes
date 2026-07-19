/* Shared class names for note document nodes. Both the editable editor
 * components (nodeComponents.tsx) and the static preview components
 * (materials/staticNodeComponents.tsx) consume these so the two surfaces
 * cannot drift apart visually. */
import type { CSSProperties } from 'react';

export const HEADING_CLASS: Record<string, string> = {
  h1: 'mt-6 mb-3 text-2xl font-bold text-fg',
  h2: 'mt-5 mb-2.5 text-xl font-bold text-fg',
  h3: 'mt-4 mb-2 text-lg font-semibold text-fg',
  h4: 'mt-3 mb-2 text-base font-semibold text-fg',
  h5: 'mt-3 mb-1.5 text-sm font-semibold text-fg',
  h6: 'mt-3 mb-1.5 text-xs font-semibold tracking-wide text-fg-muted uppercase',
};

export const PARAGRAPH_CLASS = 'my-2 leading-relaxed text-fg';
export const BLOCKQUOTE_CLASS = 'my-3 border-l-2 border-line-strong pl-4 text-fg-secondary italic';
export const HR_CLASS = 'my-5 border-divider';
export const CODE_BLOCK_CLASS =
  'my-3 overflow-auto rounded-card border border-line bg-surface-hover-bg p-3 font-mono text-xs text-fg';
export const LINK_CLASS = 'text-action-accent underline underline-offset-2';

export const UL_CLASS = 'my-2 ml-5 list-disc space-y-1';
export const OL_CLASS = 'my-2 ml-5 list-decimal space-y-1';
export const LI_CLASS = 'text-fg';

export const TABLE_WRAP_CLASS = 'my-3 overflow-auto';
export const TABLE_CLASS = 'w-full border-collapse text-sm';
export const TD_CLASS = 'border border-line px-3 py-1.5 align-top';
export const TH_CLASS = 'border border-line bg-surface-hover-bg px-3 py-1.5 text-left font-semibold';

export const CALLOUT_CLASS = 'my-3 rounded-card border border-line bg-surface-hover-bg p-3 text-fg';
export const COLUMN_GROUP_CLASS = 'my-3 flex flex-col gap-3 sm:flex-row';
export const COLUMN_CLASS = 'min-w-0 flex-1';

export const TOC_BOX_CLASS = 'my-3 rounded-card border border-line bg-surface-hover-bg p-3';
export const TOC_TITLE_CLASS = 'mb-2 text-xs font-semibold tracking-wide text-fg-muted uppercase';
export const TOC_ITEM_CLASS =
  'rounded-row px-2 py-1 text-left text-sm text-fg-secondary hover:bg-surface';
export const TOC_EMPTY_CLASS = 'text-sm text-fg-muted';
export function tocItemIndent(headingType: string): CSSProperties {
  return { paddingLeft: `${8 + Math.max(0, Number(headingType.slice(1)) - 1) * 12}px` };
}

export const MENTION_CLASS = 'rounded bg-tint-accent-1 px-1 text-tint-accent-1-fg';
export const DATE_CLASS = 'rounded bg-surface-hover-bg px-1 text-fg-secondary';

export const EQUATION_BLOCK_CLASS =
  'my-3 overflow-auto rounded-card border border-line p-3 text-center';

/* leaf marks */
export const CODE_MARK_CLASS = 'rounded bg-surface-hover-bg px-1 py-0.5 font-mono text-[0.85em]';
export const HIGHLIGHT_MARK_CLASS = 'bg-tint-accent-2 text-tint-accent-2-fg';
export const KBD_MARK_CLASS =
  'rounded border border-line bg-surface-hover-bg px-1 font-mono text-[0.8em] text-fg';
export const BOLD_MARK_CLASS = 'font-semibold';
export const ITALIC_MARK_CLASS = 'italic';

/* custom study blocks */
export const BLOCK_SHELL_CLASS = 'my-4 rounded-card border border-line bg-surface/40 p-3';
export const QUIZ_QUESTION_CLASS = 'my-3 rounded-card border border-divider bg-surface p-3';
export const QUIZ_PROMPT_CLASS = 'mb-2 font-medium text-fg';
export const QUIZ_OPTION_CLASS =
  'my-1 rounded-row border border-divider px-2 py-1.5 text-fg-secondary';
export const QUIZ_EXPLANATION_CLASS = 'mt-2 border-t border-divider pt-2 text-sm text-fg-muted';
export const FLASHCARD_CLASS =
  'my-2 grid grid-cols-1 gap-2 rounded-card border border-divider bg-surface p-3 sm:grid-cols-2';
export const FLASHCARD_FRONT_CLASS = 'font-medium text-fg';
export const FLASHCARD_BACK_CLASS = 'text-fg-secondary';
export const MERMAID_CAPTION_CLASS = 'mt-2 text-center text-sm text-fg-muted';
