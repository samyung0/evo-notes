import type { MaterialMode } from '@/features/materials/modePolicy';

export type NoteEditorMode = Extract<MaterialMode, 'edit' | 'suggestion'>;

export function canCreateExternalEditorAssets(
  mode: NoteEditorMode,
  structurallyAllowed = true
): boolean {
  return structurallyAllowed && mode === 'edit';
}

export function isEditorCommandAllowed(
  mode: NoteEditorMode,
  command: { widget?: string },
  structurallyAllowed = true
): boolean {
  return canCreateExternalEditorAssets(mode, structurallyAllowed) || command.widget !== 'media';
}
