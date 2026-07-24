import { describe, expect, it } from 'vitest';
import { materialModePolicy, resolveMaterialMode } from './modePolicy';

describe('materialModePolicy', () => {
  it('limits viewers to view mode', () => {
    expect(materialModePolicy('note', { canEdit: false, canComment: false })).toEqual({
      defaultMode: 'view',
      modes: ['view'],
    });
    expect(materialModePolicy('quiz', { canEdit: false, canComment: false })).toEqual({
      defaultMode: 'view',
      modes: ['view'],
    });
  });

  it('allows commenters to suggest but not edit', () => {
    expect(materialModePolicy('note', { canEdit: false, canComment: true })).toEqual({
      defaultMode: 'suggestion',
      modes: ['suggestion', 'view'],
    });
  });

  it('allows editors to edit, suggest, and view', () => {
    expect(materialModePolicy('note', { canEdit: true, canComment: true })).toEqual({
      defaultMode: 'edit',
      modes: ['edit', 'suggestion', 'view'],
    });
  });

  it('defaults editable quiz and flashcard materials to view mode', () => {
    const capabilities = { canEdit: true, canComment: true };
    expect(materialModePolicy('quiz', capabilities)).toEqual({
      defaultMode: 'view',
      modes: ['edit', 'suggestion', 'view'],
    });
    expect(materialModePolicy('flashcards', capabilities)).toEqual({
      defaultMode: 'view',
      modes: ['edit', 'suggestion', 'view'],
    });
  });

  it('treats canEdit as authoritative even when canComment is false', () => {
    expect(materialModePolicy('note', { canEdit: true, canComment: false }).modes).toEqual([
      'edit',
      'suggestion',
      'view',
    ]);
  });

  it('falls back when a requested mode is no longer allowed', () => {
    const viewer = materialModePolicy('note', { canEdit: false, canComment: false });
    expect(resolveMaterialMode('edit', viewer)).toBe('view');
  });
});
