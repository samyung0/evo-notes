import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCommentKey } from '@platejs/comment';
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
import { CollaborationProvider, suggestionPlugin } from './Collaboration';
import { FloatingToolbar } from './FloatingToolbar';
import type { NoteEditorMode } from './editorMode';

export function NoteEditor({
  materialId,
  mode,
  allowExternalAssets = false,
  onSuggestionDirtyChange,
}: {
  materialId: string;
  mode: NoteEditorMode;
  allowExternalAssets?: boolean;
  onSuggestionDirtyChange?: (dirty: boolean) => void;
}) {
  const { data: material, isLoading } = useMaterial(materialId);

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

  const modeAllowed =
    (mode === 'edit' && material.capabilities.canEdit) ||
    (mode === 'suggestion' && (material.capabilities.canEdit || material.capabilities.canComment));
  if (!modeAllowed) {
    return (
      <EmptyState
        title="Mode unavailable"
        body="Your current material permissions do not allow this mode."
      />
    );
  }

  return (
    <CollaborativeNoteEditor
      key={`${material.id}:${mode}`}
      material={material}
      mode={mode}
      allowExternalAssets={allowExternalAssets}
      onSuggestionDirtyChange={onSuggestionDirtyChange}
    />
  );
}

function CollaborativeNoteEditor({
  material,
  mode,
  allowExternalAssets,
  onSuggestionDirtyChange,
}: {
  material: Material;
  mode: NoteEditorMode;
  allowExternalAssets: boolean;
  onSuggestionDirtyChange?: (dirty: boolean) => void;
}) {
  const me = useMe();
  const role: WorkspaceRole | null = material.role ?? (material.isOwner ? 'owner' : null);
  const shouldLoadMembers = material.capabilities.canManageMembers;
  const members = useWorkspaceMembers(material.workspaceId, shouldLoadMembers);
  const discussions = useMaterialDiscussions(material.id);
  const canEdit = material.capabilities.canEdit;
  const canComment = material.capabilities.canComment || canEdit;
  const users = useMemo(
    () => Object.fromEntries((members.data ?? []).map((member) => [member.userId, member])),
    [members.data]
  );

  if (me.isPending || (shouldLoadMembers && members.isPending) || discussions.isPending) {
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
    mode,
    allowExternalAssets,
  };

  return (
    <EditorRuntimeProvider value={runtime}>
      <NoteEditorCore
        material={material}
        mode={mode}
        allowExternalAssets={allowExternalAssets}
        users={users}
        discussions={discussions.data ?? []}
        currentUserId={me.data?.id ?? null}
        onSuggestionDirtyChange={onSuggestionDirtyChange}
      />
    </EditorRuntimeProvider>
  );
}

function NoteEditorCore({
  material,
  mode,
  allowExternalAssets,
  users,
  discussions,
  currentUserId,
  onSuggestionDirtyChange,
}: {
  material: Material;
  mode: NoteEditorMode;
  allowExternalAssets: boolean;
  users: Record<string, NonNullable<ReturnType<typeof useWorkspaceMembers>['data']>[number]>;
  discussions: NonNullable<ReturnType<typeof useMaterialDiscussions>['data']>;
  currentUserId: string | null;
  onSuggestionDirtyChange?: (dirty: boolean) => void;
}) {
  const update = useUpdateMaterial(material.workspaceId);
  const mutateRef = useRef(update.mutate);
  mutateRef.current = update.mutate;
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'saving' | 'error'>('saved');
  const mounted = useRef(true);
  const applyingDiscussionMarks = useRef(false);
  const revisionRef = useRef(material.revision ?? 1);
  const [suggestionDirty, setSuggestionDirty] = useState(false);
  const [baseSnapshot, setBaseSnapshot] = useState(() => ({
    document:
      parseMaterialDocument(material.content) ??
      createMaterialDocument([{ type: 'p', children: [{ text: '' }] }]),
    revision: material.revision ?? 1,
  }));
  const currentDocument = useMemo(
    () => parseMaterialDocument(material.content) ?? baseSnapshot.document,
    [baseSnapshot.document, material.content]
  );
  const initialDocument = baseSnapshot.document;
  const setSuggestionDraftDirty = useCallback(
    (dirty: boolean) => {
      setSuggestionDirty(dirty);
      onSuggestionDirtyChange?.(dirty);
    },
    [onSuggestionDirtyChange]
  );

  const plugins = useMemo(
    () =>
      buildPlugins({
        workspaceId: material.workspaceId,
        currentUserId,
        users,
        discussions,
        mode,
        allowExternalAssets,
      }),
    [allowExternalAssets, currentUserId, discussions, material.workspaceId, mode, users]
  );

  const editor = usePlateEditor({
    plugins,
    components: noteComponents,
    value: () => structuredClone(initialDocument.value),
  });
  const replaceEditorDocument = useCallback(
    (value: MaterialValue) => {
      applyingDiscussionMarks.current = true;
      editor.tf.setValue(structuredClone(value));
      queueMicrotask(() => {
        applyingDiscussionMarks.current = false;
      });
    },
    [editor]
  );

  useEffect(() => {
    const isSuggesting = mode === 'suggestion';
    const getOption = editor.getOption as (plugin: unknown, key: string) => unknown;
    const setOption = editor.setOption as (plugin: unknown, key: string, value: unknown) => void;
    if (getOption(suggestionPlugin, 'isSuggesting') !== isSuggesting) {
      setOption(suggestionPlugin, 'isSuggesting', isSuggesting);
    }
  }, [editor, mode]);

  useEffect(() => {
    if (mode !== 'suggestion' || suggestionDirty) return;
    const nextRevision = material.revision ?? 1;
    if (nextRevision === baseSnapshot.revision) return;
    const nextDocument =
      parseMaterialDocument(material.content) ??
      createMaterialDocument([{ type: 'p', children: [{ text: '' }] }]);
    revisionRef.current = nextRevision;
    setBaseSnapshot({ document: nextDocument, revision: nextRevision });
    replaceEditorDocument(nextDocument.value);
  }, [
    baseSnapshot.revision,
    material.content,
    material.revision,
    mode,
    replaceEditorDocument,
    suggestionDirty,
  ]);

  useEffect(() => {
    if (!suggestionDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [suggestionDirty]);

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
          const savedDocument =
            parseMaterialDocument(saved.content) ??
            createMaterialDocument(editor.children as MaterialValue);
          if (mounted.current) {
            setBaseSnapshot({ document: savedDocument, revision: revisionRef.current });
          }
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
  }, [editor, material.id]);

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
    if (applyingDiscussionMarks.current) return;
    if (mode === 'suggestion') {
      setSuggestionDraftDirty(true);
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
            baseDocument={baseSnapshot.document}
            baseRevision={baseSnapshot.revision}
            currentDocument={currentDocument}
            currentRevision={Math.max(material.revision ?? 1, revisionRef.current)}
            discussions={discussions}
            suggestionDirty={suggestionDirty}
            onSuggestionReset={() => setSuggestionDraftDirty(false)}
            replaceEditorDocument={replaceEditorDocument}
            onBaseDocumentChange={(document, revision) => {
              revisionRef.current = revision;
              setBaseSnapshot({ document, revision });
            }}
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
                    {mode === 'suggestion' && (suggestionDirty ? 'Suggestion draft' : 'Suggesting')}
                    {mode === 'edit' && saveState === 'saved' && 'Saved'}
                    {mode === 'edit' && saveState === 'pending' && 'Unsaved'}
                    {mode === 'edit' && saveState === 'saving' && 'Saving…'}
                    {mode === 'edit' && saveState === 'error' && 'Save conflict or failure'}
                  </span>
                  {mode === 'edit' && allowExternalAssets && <VoiceButton />}
                </>
              }
            />
            <div className="min-h-0 flex-1 overflow-auto">
              <PlateContent
                className={cn(
                  'note-editor mx-auto min-h-75 max-w-3xl px-10 py-6 text-[0.95rem] outline-none max-sm:px-5'
                )}
                placeholder="Start writing…"
              />
            </div>
            <FloatingToolbar />
            {allowExternalAssets && <AiMenu />}
          </CollaborationProvider>
        </Plate>
      </div>
    </NoteBlockDialogsProvider>
  );
}
