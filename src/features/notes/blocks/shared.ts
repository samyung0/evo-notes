/* ============================================================
   Custom Plate void nodes for embeddable study blocks. Quizzes, flashcards and
   mermaid diagrams are stored inside the note markdown as fenced code blocks
   (```quiz / ```flashcards / ```mermaid, YAML/DSL body). Inside the editor they
   are represented as void element nodes whose `code` prop holds that fence body.
   The MarkdownPlugin rules (see ../markdown.ts) convert between the two.
   ============================================================ */
import YAML from 'yaml';
import type { FlashcardContent, QuizBlock } from '@/features/materials/blocks';

/** Element type keys for the custom void nodes. Kept in sync with the fence
 * language identifiers so markdown round-trips through the shared blocks.ts. */
export const QUIZ_KEY = 'quiz';
export const FLASHCARDS_KEY = 'flashcards';
export const MERMAID_KEY = 'mermaid';

export const CUSTOM_BLOCK_LANGS = [QUIZ_KEY, FLASHCARDS_KEY, MERMAID_KEY] as const;
export type CustomBlockLang = (typeof CUSTOM_BLOCK_LANGS)[number];

export function isCustomBlockLang(lang: unknown): lang is CustomBlockLang {
  return typeof lang === 'string' && (CUSTOM_BLOCK_LANGS as readonly string[]).includes(lang);
}

/** Element node shape for a custom void block. */
export interface CustomBlockElement {
  type: CustomBlockLang;
  code: string;
  children: [{ text: '' }];
}

export function customBlockNode(type: CustomBlockLang, code: string): CustomBlockElement {
  return { type, code, children: [{ text: '' }] };
}

/** Serialize quiz form data to a ```quiz fence body (YAML). */
export function quizFenceBody(data: QuizBlock): string {
  const payload: Record<string, unknown> = { questions: data.questions ?? [] };
  if (data.timeLimitMin != null) payload.timeLimitMin = data.timeLimitMin;
  return YAML.stringify(payload);
}

/** Serialize flashcards to a ```flashcards fence body (YAML). */
export function flashcardsFenceBody(cards: FlashcardContent[]): string {
  return YAML.stringify({ cards: cards ?? [] });
}
