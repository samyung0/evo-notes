import { describe, expect, it } from 'vitest';
import { canCreateExternalEditorAssets, isEditorCommandAllowed } from './editorMode';

describe('suggestion mode plugin gates', () => {
  it('prevents irreversible asset creation in suggestion mode', () => {
    expect(canCreateExternalEditorAssets('suggestion')).toBe(false);
    expect(isEditorCommandAllowed('suggestion', { widget: 'media' })).toBe(false);
  });

  it('keeps formatting and existing media renderers available', () => {
    expect(isEditorCommandAllowed('suggestion', {})).toBe(true);
    expect(isEditorCommandAllowed('suggestion', { widget: 'table' })).toBe(true);
  });

  it('allows asset commands in edit mode', () => {
    expect(canCreateExternalEditorAssets('edit')).toBe(true);
    expect(isEditorCommandAllowed('edit', { widget: 'media' })).toBe(true);
  });

  it('blocks asset commands for content-only shared editors', () => {
    expect(canCreateExternalEditorAssets('edit', false)).toBe(false);
    expect(isEditorCommandAllowed('edit', { widget: 'media' }, false)).toBe(false);
    expect(isEditorCommandAllowed('edit', { widget: 'table' }, false)).toBe(true);
  });
});
