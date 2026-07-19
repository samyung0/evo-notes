import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCommentKey } from '@platejs/comment';
import { SuggestionPlugin } from '@platejs/suggestion/react';
import { KEYS, TextApi } from 'platejs';
import { Plate, PlateContent, usePlateEditor } from 'platejs/react';
import { EmptyState, Spinner } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  useMaterial,
  useMaterialDiscussions,
  useMe,
  useUpdateMaterial,
  useWorkspaceMembers,
} from '@/api/hooks';
import type { Material, WorkspaceRole } from '@/api/types';
import { NoteBlockDialogsProvider } from './blocks/dialogContext';
import { NoteToolbar } from './NoteToolbar';
import { AiMenu } from './ai/AiMenu';
import { VoiceButton } from './ai/VoiceButton';
import { buildPlugins } from './plugins';
import { noteComponents } from './nodeComponents';
import {
  createMaterialDocument,
  parseMaterialDocument,
  type MaterialDocument,
  type MaterialValue,
} from '@/features/materials/document';
import { EditorRuntimeProvider, type EditorRuntimeValue } from './EditorRuntime';
import { CollaborationProvider } from './Collaboration';
import { FloatingToolbar } from './FloatingToolbar';

export function NoteEditor({
  materialId,
  readOnly = false,
}: {
  materialId: string;
  readOnly?: boolean;
}) {
  const { data: material, isLoading } = useMaterial(materialId);

  console.log(material);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!material) {
    return <EmptyState title="Note not found" body="This note may have been deleted." />;
  }

  return (
    <CollaborativeNoteEditor key={material.id} material={material} publicReadOnly={readOnly} />
  );
}

function CollaborativeNoteEditor({
  material,
  publicReadOnly,
}: {
  material: Material;
  publicReadOnly: boolean;
}) {
  const me = useMe();
  const role: WorkspaceRole | null = material.role ?? (material.isOwner ? 'owner' : null);
  const members = useWorkspaceMembers(material.workspaceId, role !== null);
  const discussions = useMaterialDiscussions(material.id);
  const canEdit = material.capabilities.canEdit;
  const canComment = material.capabilities.canComment;
  const effectiveReadOnly = (!canEdit && !canComment) || (publicReadOnly && role === null);
  const users = useMemo(
    () => Object.fromEntries((members.data ?? []).map((member) => [member.userId, member])),
    [members.data]
  );

  if (me.isPending || members.isPending || discussions.isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const runtime: EditorRuntimeValue = {
    materialId: material.id,
    workspaceId: material.workspaceId,
    currentUserId: me.data?.id ?? null,
    role,
    canEdit,
    canComment,
  };

  return (
    <EditorRuntimeProvider value={runtime}>
      <NoteEditorCore
        material={material}
        readOnly={effectiveReadOnly}
        users={users}
        discussions={discussions.data ?? []}
        currentUserId={me.data?.id ?? null}
        canEdit={canEdit}
        canComment={canComment}
        role={role}
      />
    </EditorRuntimeProvider>
  );
}

function NoteEditorCore({
  material,
  readOnly,
  users,
  discussions,
  currentUserId,
  canEdit,
  canComment,
  role,
}: {
  material: Material;
  readOnly: boolean;
  users: Record<string, NonNullable<ReturnType<typeof useWorkspaceMembers>['data']>[number]>;
  discussions: NonNullable<ReturnType<typeof useMaterialDiscussions>['data']>;
  currentUserId: string | null;
  canEdit: boolean;
  canComment: boolean;
  role: WorkspaceRole | null;
}) {
  const update = useUpdateMaterial(material.workspaceId);
  const mutateRef = useRef(update.mutate);
  mutateRef.current = update.mutate;
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'saving' | 'error'>('saved');
  const mounted = useRef(true);
  const applyingDiscussionMarks = useRef(false);
  const revisionRef = useRef(material.revision ?? 1);
  const [suggestionDirty, setSuggestionDirty] = useState(false);
  const initialDocument = useMemo(
    () =>
      parseMaterialDocument(material.content) ??
      createMaterialDocument([{ type: 'p', children: [{ text: '' }] }]),
    [material.content]
  );

  const plugins = useMemo(
    () =>
      buildPlugins({
        workspaceId: material.workspaceId,
        currentUserId,
        users,
        discussions,
      }),
    [currentUserId, discussions, material.workspaceId, users]
  );

  const editor = usePlateEditor({
    plugins,
    components: noteComponents,
    value: () => structuredClone(initialDocument.value),
  });

  useEffect(() => {
    const isSuggesting = role === 'commenter';
    if (editor.getOption(SuggestionPlugin, 'isSuggesting') !== isSuggesting) {
      editor.setOption(SuggestionPlugin, 'isSuggesting', isSuggesting);
    }
  }, [editor, role]);

  useEffect(() => {
    applyingDiscussionMarks.current = true;
    editor.tf.withoutSaving(() => {
      for (const discussion of discussions) {
        if (!discussion.anchor) continue;
        try {
          editor.tf.setNodes(
            {
              [KEYS.comment]: true,
              [getCommentKey(discussion.id)]: true,
            },
            { at: discussion.anchor, match: TextApi.isText, split: true }
          );
        } catch {
          // Anchors are revision-relative; stale anchors remain available in the thread list.
        }
      }
    });
    queueMicrotask(() => {
      applyingDiscussionMarks.current = false;
    });
  }, [discussions, editor]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<MaterialDocument | null>(null);
  const saveInFlight = useRef(false);

  const flush = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (saveInFlight.current) return;
    const content = pending.current;
    if (!content) return;
    pending.current = null;
    saveInFlight.current = true;
    if (mounted.current) setSaveState('saving');
    mutateRef.current(
      {
        id: material.id,
        patch: { content, expectedRevision: revisionRef.current },
      },
      {
        onSuccess: (saved) => {
          saveInFlight.current = false;
          revisionRef.current = saved.revision ?? revisionRef.current + 1;
          if (pending.current) {
            if (mounted.current) setSaveState('pending');
            queueMicrotask(flush);
          } else if (mounted.current) {
            setSaveState('saved');
          }
        },
        onError: () => {
          saveInFlight.current = false;
          pending.current ??= content;
          if (mounted.current) setSaveState('error');
        },
      }
    );
  }, [material.id]);

  const schedule = useCallback(
    (content: MaterialDocument) => {
      pending.current = content;
      setSaveState('pending');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, 800);
    },
    [flush]
  );

  useEffect(
    () => () => {
      flush();
      mounted.current = false;
    },
    [flush]
  );

  function onEditorChange() {
    if (readOnly || applyingDiscussionMarks.current) return;
    if (!canEdit && canComment) {
      setSuggestionDirty(true);
      return;
    }
    try {
      schedule(createMaterialDocument(editor.children as MaterialValue));
    } catch {
      setSaveState('error');
    }
  }

  return (
    <NoteBlockDialogsProvider>
      <div className="flex h-full flex-col">
        <Plate editor={editor} onChange={onEditorChange}>
          <CollaborationProvider
            baseDocument={initialDocument}
            baseRevision={revisionRef.current}
            suggestionDirty={suggestionDirty}
            onSuggestionReset={() => setSuggestionDirty(false)}
          >
            <NoteToolbar
              right={
                <>
                  <span
                    className={cn(
                      'px-1 text-xs text-fg-muted',
                      saveState === 'error' && 'text-solid-error'
                    )}
                    role="status"
                  >
                    {!canEdit &&
                      canComment &&
                      (suggestionDirty ? 'Suggestion draft' : 'Suggesting')}
                    {canEdit && saveState === 'saved' && 'Saved'}
                    {canEdit && saveState === 'pending' && 'Unsaved'}
                    {canEdit && saveState === 'saving' && 'Saving…'}
                    {canEdit && saveState === 'error' && 'Save conflict or failure'}
                  </span>
                  {!readOnly && <VoiceButton />}
                </>
              }
            />
            <div className="min-h-0 flex-1 overflow-auto">
              <PlateContent
                className={cn(
                  'note-editor mx-auto min-h-75 max-w-3xl px-10 py-6 text-[0.95rem] outline-none max-sm:px-5',
                  readOnly && 'select-text'
                )}
                placeholder="Start writing…"
                readOnly={readOnly}
              />
            </div>
            <FloatingToolbar />
            <AiMenu />
          </CollaborationProvider>
        </Plate>
      </div>
    </NoteBlockDialogsProvider>
  );
}
