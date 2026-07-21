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

  it('handles block and void suggestion metadata', () => {
    const blocks = [
      {
        type: 'p',
        suggestion: { id: 'removed-block', type: 'remove', userId: 'editor' },
        children: [{ text: 'removed block' }],
      },
      {
        type: 'img',
        assetId: 'asset-1',
        suggestion: { id: 'inserted-void', type: 'insert', userId: 'editor' },
        children: [{ text: '' }],
      },
    ] as MaterialValue;

    expect(finalizeSuggestionValue(blocks, 'accept')).toEqual([
      { type: 'img', assetId: 'asset-1', children: [{ text: '' }] },
    ]);
    expect(finalizeSuggestionValue(blocks, 'reject')).toEqual([
      { type: 'p', children: [{ text: 'removed block' }] },
    ]);
  });
});
