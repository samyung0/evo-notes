/**
 * Deterministic fixtures for the e2e editor feature matrix
 * (e2e/editor/playwright.editor.config.ts). Loaded into the mock db when
 * VITE_E2E_EDITOR_SEED=true. The matrix runs entirely against MSW: module
 * state lives in the page, so every navigation starts from this pristine seed.
 */

export const EDITOR_WORKSPACE_ID = 'ws_bio';

export const EDITOR_NOTE = {
  id: 'mat_e2e_editor',
  title: 'Editor matrix note',
  headingText: 'Editor matrix heading',
  firstParagraph: 'First paragraph alpha',
  secondParagraph: 'Second paragraph beta',
  thirdParagraph: 'Third paragraph gamma',
};

export const SUGGEST_NOTE = {
  id: 'mat_e2e_suggest',
  title: 'Suggestion matrix note',
  headingText: 'Suggestion matrix heading',
  body: 'Original suggestion sentence',
};

export function buildEditorNoteValue() {
  return [
    { type: 'h1', children: [{ text: EDITOR_NOTE.headingText }] },
    { type: 'p', children: [{ text: EDITOR_NOTE.firstParagraph }] },
    { type: 'p', children: [{ text: EDITOR_NOTE.secondParagraph }] },
    { type: 'p', children: [{ text: EDITOR_NOTE.thirdParagraph }] },
  ];
}

export function buildSuggestNoteValue() {
  return [
    { type: 'h1', children: [{ text: SUGGEST_NOTE.headingText }] },
    { type: 'p', children: [{ text: SUGGEST_NOTE.body }] },
  ];
}
