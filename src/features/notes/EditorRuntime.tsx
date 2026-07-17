import { createContext, useContext } from 'react';
import type { WorkspaceRole } from '@/api/types';

export interface EditorRuntimeValue {
  materialId: string;
  workspaceId: string;
  currentUserId: string | null;
  role: WorkspaceRole | null;
  canEdit: boolean;
  canComment: boolean;
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
