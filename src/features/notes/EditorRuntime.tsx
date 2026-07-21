import { createContext, useContext } from 'react';
import type { WorkspaceRole } from '@/api/types';
import type { NoteEditorMode } from './editorMode';

export interface EditorRuntimeValue {
  materialId: string;
  workspaceId: string;
  currentUserId: string | null;
  role: WorkspaceRole | null;
  canEdit: boolean;
  canComment: boolean;
  mode: NoteEditorMode;
  /** Structural workspace permission used to gate uploads and other side effects. */
  allowExternalAssets: boolean;
}

const EditorRuntimeContext = createContext<EditorRuntimeValue | null>(null);

export function EditorRuntimeProvider({
  value,
  children,
}: {
  value: EditorRuntimeValue;
  children: React.ReactNode;
}) {
  return <EditorRuntimeContext.Provider value={value}>{children}</EditorRuntimeContext.Provider>;
}

export function useEditorRuntime() {
  const value = useContext(EditorRuntimeContext);
  if (!value) throw new Error('EditorRuntimeProvider is missing');
  return value;
}
