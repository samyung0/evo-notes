import { describe, expect, it } from 'vitest';
import type { MaterialValue } from '@/features/materials/document';
import { finalizeSuggestionValue } from './suggestions';

const proposed = [
  {
    type: 'p',
    children: [
      { text: 'Keep ' },
      {
        text: 'old',
        suggestion: true,
        suggestion_remove: { id: 'remove', type: 'remove', userId: 'commenter' },
      },
      {
        text: 'new',
        bold: true,
        suggestion: true,
        suggestion_insert: { id: 'insert', type: 'insert', userId: 'commenter' },
      },
    ],
  },
] as MaterialValue;

describe('finalizeSuggestionValue', () => {
  it('accepts inserted text and removes deleted text', () => {
    expect(finalizeSuggestionValue(proposed, 'accept')).toEqual([
      { type: 'p', children: [{ text: 'Keep ' }, { text: 'new', bold: true }] },
    ]);
  });

  it('rejects inserted text and restores deleted text', () => {
    expect(finalizeSuggestionValue(proposed, 'reject')).toEqual([
      { type: 'p', children: [{ text: 'Keep ' }, { text: 'old' }] },
    ]);
  });
});
