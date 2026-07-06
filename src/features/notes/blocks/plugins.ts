import { createPlatePlugin } from 'platejs/react';
import { FLASHCARDS_KEY, MERMAID_KEY, QUIZ_KEY } from './shared';
import { FlashcardsElement, MermaidElement, QuizElement } from './elements';

/** Void element plugins for the embeddable study blocks. Their markdown
 * serialization is handled by MarkdownPlugin rules (see ../markdown.ts). */
export const QuizElementPlugin = createPlatePlugin({
  key: QUIZ_KEY,
  node: { isElement: true, isVoid: true, type: QUIZ_KEY },
}).withComponent(QuizElement);

export const FlashcardsElementPlugin = createPlatePlugin({
  key: FLASHCARDS_KEY,
  node: { isElement: true, isVoid: true, type: FLASHCARDS_KEY },
}).withComponent(FlashcardsElement);

export const MermaidElementPlugin = createPlatePlugin({
  key: MERMAID_KEY,
  node: { isElement: true, isVoid: true, type: MERMAID_KEY },
}).withComponent(MermaidElement);

export const customBlockPlugins = [QuizElementPlugin, FlashcardsElementPlugin, MermaidElementPlugin];
