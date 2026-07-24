import { describe, expect, it } from 'vitest';
import type { MaterialValue } from '@/features/materials/document';
import {
  buildSubmittedSuggestionAnchor,
  finalizeSuggestionValue,
  suggestionAnchorBlockId,
  suggestionChangeItems,
} from './suggestions';

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

describe('suggestionChangeItems', () => {
  it('derives Add/Delete items from marked leaves', () => {
    expect(suggestionChangeItems(proposed)).toEqual([
      { type: 'remove', text: 'old' },
      { type: 'insert', text: 'new' },
    ]);
  });

  it('merges adjacent same-type runs split by formatting marks', () => {
    const value = [
      {
        type: 'p',
        children: [
          { text: 'Keep ' },
          {
            text: 'hello ',
            suggestion: true,
            suggestion_a: { id: 'a', type: 'insert', userId: 'u' },
          },
          {
            text: 'world',
            bold: true,
            suggestion: true,
            suggestion_a: { id: 'a', type: 'insert', userId: 'u' },
          },
        ],
      },
    ] as MaterialValue;

    expect(suggestionChangeItems(value)).toEqual([{ type: 'insert', text: 'hello world' }]);
  });

  it('does not merge runs separated by unchanged text', () => {
    const value = [
      {
        type: 'p',
        children: [
          { text: 'a', suggestion: true, suggestion_1: { id: '1', type: 'insert', userId: 'u' } },
          { text: ' unchanged ' },
          { text: 'b', suggestion: true, suggestion_2: { id: '2', type: 'insert', userId: 'u' } },
        ],
      },
    ] as MaterialValue;

    expect(suggestionChangeItems(value)).toEqual([
      { type: 'insert', text: 'a' },
      { type: 'insert', text: 'b' },
    ]);
  });

  it('reports fully suggested blocks once, not per leaf', () => {
    const value = [
      {
        type: 'p',
        suggestion: { id: 'block', type: 'insert', userId: 'u' },
        children: [
          { text: 'new ', suggestion: true, suggestion_block: { id: 'block', type: 'insert', userId: 'u' } },
          { text: 'block', suggestion: true, suggestion_block: { id: 'block', type: 'insert', userId: 'u' } },
        ],
      },
    ] as MaterialValue;

    expect(suggestionChangeItems(value)).toEqual([{ type: 'insert', text: 'new block' }]);
  });

  it('labels line-break suggestions', () => {
    const value = [
      {
        type: 'p',
        suggestion: { id: 'lb', type: 'insert', userId: 'u', isLineBreak: true },
        children: [{ text: '' }],
      },
    ] as MaterialValue;

    expect(suggestionChangeItems(value)).toEqual([{ type: 'insert', text: '(line break)' }]);
  });

  it('returns no items for a clean document', () => {
    const value = [
      { type: 'p', children: [{ text: 'plain' }] },
      { type: 'h1', children: [{ text: 'title' }] },
    ] as MaterialValue;

    expect(suggestionChangeItems(value)).toEqual([]);
  });
});

describe('submitted suggestion anchors', () => {
  it('anchors an inserted line to the changed block that survives the editor reset', () => {
    const baseValue = [
      { type: 'p', id: 'before', children: [{ text: 'Before' }] },
      { type: 'p', id: 'changed', children: [{ text: 'Changed' }] },
    ] as MaterialValue;
    const proposedValue = [
      baseValue[0],
      {
        ...baseValue[1],
        suggestion: { id: 'line', type: 'insert', userId: 'u', isLineBreak: true },
      },
      {
        type: 'p',
        id: 'inserted',
        children: [
          {
            text: '',
            suggestion: true,
            suggestion_line: { id: 'line', type: 'insert', userId: 'u' },
          },
        ],
      },
    ] as MaterialValue;

    expect(
      buildSubmittedSuggestionAnchor({
        baseValue,
        proposedValue,
        selection: {
          anchor: { path: [2, 0], offset: 0 },
          focus: { path: [2, 0], offset: 0 },
        },
      })
    ).toEqual({
      scope: 'document',
      blockId: 'changed',
      selection: {
        anchor: { path: [1, 0], offset: 0 },
        focus: { path: [1, 0], offset: 0 },
      },
    });
  });

  it('recovers a block id from a legacy selection-only anchor', () => {
    expect(
      suggestionAnchorBlockId({
        id: 'suggestion',
        materialId: 'material',
        userId: 'u',
        baseRevision: 1,
        anchor: { selection: { focus: { path: [1, 0], offset: 0 } } },
        originalFragment: [
          { type: 'p', id: 'first', children: [{ text: '' }] },
          { type: 'p', id: 'second', children: [{ text: '' }] },
        ],
        proposedFragment: null,
        status: 'pending',
        createdAt: '',
        updatedAt: '',
      })
    ).toBe('second');
  });
});
