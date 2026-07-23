import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCommentKey } from '@platejs/comment';
import { KEYS, TextApi } from 'platejs';
import {
  Plate,
  PlateContainer,
  PlateContent,
  useEditorSelector,
  usePlateEditor,
} from 'platejs/react';
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
  countMaterialMetrics,
  createMaterialDocumentWithMetrics,
  MATERIAL_DOCUMENT_LIMITS,
  normalizeMaterialValueWithMetrics,
  parseMaterialDocument,
  parseMaterialDocumentWithMetrics,
  type MaterialDocument,
  type MaterialDocumentMetrics,
  type MaterialValue,
} from '@/features/materials/document';
import { EditorRuntimeProvider, type EditorRuntimeValue } from './EditorRuntime';
import { CollaborationProvider, suggestionPlugin } from './Collaboration';
import { FloatingToolbar } from './FloatingToolbar';
import type { NoteEditorMode, NoteEditorSaveState, NoteEditorStatus } from './editorMode';
import { formatContentSize, contentSizeKilobytes, shouldShowDocumentStats } from './documentStats';

const NOTE_PLACEHOLDER = 'Type  /  for commands ...';

function materialDocumentSnapshot(
  input: unknown,
  fallbackValue?: MaterialValue
): {
  document: MaterialDocument;
  metrics: MaterialDocumentMetrics;
} {
  return (
    parseMaterialDocumentWithMetrics(input) ??
    createMaterialDocumentWithMetrics(fallbackValue ?? [{ type: 'p', children: [{ text: '' }] }])
  );
}

function DocumentStatsFooter({
  metrics,
  contentBytes,
}: {
  metrics: MaterialDocumentMetrics;
  contentBytes: number | null;
}) {
  if (!shouldShowDocumentStats(metrics, contentBytes)) return null;

  return (
    <div
      className="mx-auto flex w-full max-w-3xl gap-3 px-10 pb-4 text-xs text-fg-muted max-sm:px-5"
      aria-label="Document statistics"
    >
      <span
        className={cn(
          metrics.nodeCount >= MATERIAL_DOCUMENT_LIMITS.maxNodes * 0.85 && 'text-solid-error'
        )}
      >
        Nodes: {metrics.nodeCount.toLocaleString()}/
        {MATERIAL_DOCUMENT_LIMITS.maxNodes.toLocaleString()}
      </span>
      <span
        className={cn(
          metrics.maxDepth >= MATERIAL_DOCUMENT_LIMITS.maxDepth * 0.85 && 'text-solid-error'
        )}
      >
        Depth: {metrics.maxDepth}/{MATERIAL_DOCUMENT_LIMITS.maxDepth}
      </span>
      <span
        className={cn(
          contentBytes &&
            contentSizeKilobytes(contentBytes) >=
              contentSizeKilobytes(MATERIAL_DOCUMENT_LIMITS.maxContentBytes) * 0.85 &&
            'text-solid-error'
        )}
      >
        Size: {formatContentSize(contentBytes)}/
        {contentSizeKilobytes(MATERIAL_DOCUMENT_LIMITS.maxContentBytes).toLocaleString()} KB
      </span>
    </div>
  );
}

function NoteEditorContent() {
  const showEditorPlaceholder = useEditorSelector((editor) => {
    const firstNode = editor.children[0];

    // Keep the editor-level placeholder mutually exclusive with
    // BlockPlaceholderPlugin. List metadata makes an otherwise empty block
    // structurally meaningful, so it must use the block placeholder.
    return (
      editor.children.length === 1 &&
      !!firstNode &&
      editor.api.isEmpty(firstNode) &&
      editor.api.isElementStateEmpty(firstNode)
    );
  }, []);

  return (
    // The relative container registers the ref used by cursor-overlay
    // positioning (selection highlight while the AI menu input has focus).
    <PlateContainer className="relative">
      <PlateContent
        className={cn(
          'note-editor mx-auto min-h-75 max-w-3xl px-10 pt-4 pb-16 text-base outline-none **:data-slate-placeholder:translate-y-1 **:data-slate-placeholder:text-sm **:data-slate-placeholder:leading-loose **:data-slate-placeholder:text-placeholder **:data-slate-placeholder:opacity-100! max-sm:px-5'
        )}
        placeholder={showEditorPlaceholder ? NOTE_PLACEHOLDER : undefined}
      />
    </PlateContainer>
  );
}

export function NoteEditor({
  materialId,
  mode,
  allowExternalAssets = false,
  onSuggestionDirtyChange,
  onEditorStatusChange,
}: {
  materialId: string;
  mode: NoteEditorMode;
  allowExternalAssets?: boolean;
  onSuggestionDirtyChange?: (dirty: boolean) => void;
  onEditorStatusChange?: (status: NoteEditorStatus | null) => void;
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
      onEditorStatusChange={onEditorStatusChange}
    />
  );
}

function CollaborativeNoteEditor({
  material,
  mode,
  allowExternalAssets,
  onSuggestionDirtyChange,
  onEditorStatusChange,
}: {
  material: Material;
  mode: NoteEditorMode;
  allowExternalAssets: boolean;
  onSuggestionDirtyChange?: (dirty: boolean) => void;
  onEditorStatusChange?: (status: NoteEditorStatus | null) => void;
}) {
  const me = useMe();
  const role: WorkspaceRole | null = material.role ?? (material.isOwner ? 'owner' : null);
  // Mentions/comments need the member directory for any collaborator, not only
  // owners who can manage invites (`canManageMembers`).
  const members = useWorkspaceMembers(material.workspaceId);
  const discussions = useMaterialDiscussions(material.id);
  const canEdit = material.capabilities.canEdit;
  const canComment = material.capabilities.canComment || canEdit;
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
        onEditorStatusChange={onEditorStatusChange}
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
  onEditorStatusChange,
}: {
  material: Material;
  mode: NoteEditorMode;
  allowExternalAssets: boolean;
  users: Record<string, NonNullable<ReturnType<typeof useWorkspaceMembers>['data']>[number]>;
  discussions: NonNullable<ReturnType<typeof useMaterialDiscussions>['data']>;
  currentUserId: string | null;
  onSuggestionDirtyChange?: (dirty: boolean) => void;
  onEditorStatusChange?: (status: NoteEditorStatus | null) => void;
}) {
  const update = useUpdateMaterial(material.workspaceId);
  const mutateRef = useRef(update.mutate);
  mutateRef.current = update.mutate;
  const [saveState, setSaveState] = useState<NoteEditorSaveState>('saved');
  const mounted = useRef(true);
  const applyingDiscussionMarks = useRef(false);
  const saveShortcutRef = useRef<() => void>(() => {});
  const revisionRef = useRef(material.revision ?? 1);
  const [suggestionDirty, setSuggestionDirty] = useState(false);
  const [baseSnapshot, setBaseSnapshot] = useState(() => ({
    ...materialDocumentSnapshot(material.content),
    revision: material.revision ?? 1,
  }));
  const [documentMetrics, setDocumentMetrics] = useState<MaterialDocumentMetrics>(
    () => baseSnapshot.metrics
  );
  const [savedContentBytes, setSavedContentBytes] = useState<number | null>(
    () => material.contentBytes ?? null
  );
  const updateDocumentMetrics = useCallback((next: MaterialDocumentMetrics) => {
    setDocumentMetrics((current) =>
      current.nodeCount === next.nodeCount && current.maxDepth === next.maxDepth ? current : next
    );
  }, []);
  const currentDocument = useMemo(
    () => {
      // `currentDocument` is only used to reset a dirty suggestion onto a
      // newer server revision. Direct-edit saves already update baseSnapshot
      // from the immutable request snapshot, so parsing the query-cache copy
      // after every successful save would be a redundant full-tree walk.
      if (mode !== 'suggestion' || (material.revision ?? 1) === baseSnapshot.revision) {
        return baseSnapshot.document;
      }
      return parseMaterialDocument(material.content) ?? baseSnapshot.document;
    },
    [baseSnapshot.document, baseSnapshot.revision, material.content, material.revision, mode]
  );
  const initialDocument = baseSnapshot.document;
  const setSuggestionDraftDirty = useCallback(
    (dirty: boolean) => {
      setSuggestionDirty(dirty);
      onSuggestionDirtyChange?.(dirty);
    },
    [onSuggestionDirtyChange]
  );
  const onSaveShortcut = useCallback(() => {
    // Suggestions are submitted through the collaboration workflow rather
    // than persisted as direct material edits.
    if (mode === 'edit') saveShortcutRef.current();
  }, [mode]);

  useEffect(() => {
    const status: NoteEditorStatus =
      mode === 'suggestion'
        ? { mode: 'suggestion', dirty: suggestionDirty }
        : { mode: 'edit', saveState };
    onEditorStatusChange?.(status);
  }, [mode, onEditorStatusChange, saveState, suggestionDirty]);

  useEffect(
    () => () => {
      onEditorStatusChange?.(null);
    },
    [onEditorStatusChange]
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
        onSave: onSaveShortcut,
      }),
    [
      allowExternalAssets,
      currentUserId,
      discussions,
      material.workspaceId,
      mode,
      onSaveShortcut,
      users,
    ]
  );

  const editor = usePlateEditor({
    plugins,
    components: noteComponents,
    value: () => structuredClone(initialDocument.value),
  });
  const replaceEditorDocument = useCallback(
    (value: MaterialValue) => {
      const normalized = normalizeMaterialValueWithMetrics(value);
      updateDocumentMetrics(normalized.metrics);
      applyingDiscussionMarks.current = true;
      editor.tf.setValue(structuredClone(normalized.value));
      queueMicrotask(() => {
        applyingDiscussionMarks.current = false;
      });
    },
    [editor, updateDocumentMetrics]
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
    const nextSnapshot = materialDocumentSnapshot(material.content);
    revisionRef.current = nextRevision;
    setBaseSnapshot({ ...nextSnapshot, revision: nextRevision });
    updateDocumentMetrics(nextSnapshot.metrics);
    setSavedContentBytes(material.contentBytes ?? null);
    replaceEditorDocument(nextSnapshot.document.value);
  }, [
    baseSnapshot.revision,
    material.content,
    material.contentBytes,
    material.revision,
    mode,
    replaceEditorDocument,
    updateDocumentMetrics,
    suggestionDirty,
  ]);

  useEffect(() => {
    if ((material.revision ?? 1) >= revisionRef.current) {
      setSavedContentBytes(material.contentBytes ?? null);
    }
  }, [material.contentBytes, material.revision]);

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
  const pending = useRef(false);
  const saveInFlight = useRef(false);

  // Metrics for the stats footer are refreshed on a short debounce with a
  // read-only counting walk. The expensive normalize + validate walk runs only
  // in `flush`, once per debounced save, never per keystroke.
  const metricsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleMetricsRefresh = useCallback(() => {
    if (metricsTimer.current) clearTimeout(metricsTimer.current);
    metricsTimer.current = setTimeout(() => {
      metricsTimer.current = null;
      updateDocumentMetrics(countMaterialMetrics(editor.children as MaterialValue));
    }, 1000);
  }, [editor, updateDocumentMetrics]);
  useEffect(
    () => () => {
      if (metricsTimer.current) clearTimeout(metricsTimer.current);
    },
    []
  );

  const flush = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (saveInFlight.current) return;
    if (!pending.current) return;
    // Serialize the live editor value now rather than a keystroke-time
    // snapshot: repairs (stable ids) and validation happen once per save.
    let snapshot: { document: MaterialDocument; metrics: MaterialDocumentMetrics };
    try {
      snapshot = createMaterialDocumentWithMetrics(editor.children as MaterialValue);
      updateDocumentMetrics(snapshot.metrics);
    } catch {
      if (mounted.current) setSaveState('error');
      return;
    }
    pending.current = false;
    saveInFlight.current = true;
    if (mounted.current) setSaveState('saving');
    mutateRef.current(
      {
        id: material.id,
        patch: { content: snapshot.document, expectedRevision: revisionRef.current },
      },
      {
        onSuccess: (saved) => {
          saveInFlight.current = false;
          revisionRef.current = saved.revision ?? revisionRef.current + 1;
          if (mounted.current) {
            // The server validates and stores this envelope without
            // transforming it. Reuse the already-normalized immutable request
            // snapshot instead of parsing an echoed 8k-node response.
            setBaseSnapshot({ ...snapshot, revision: revisionRef.current });
            updateDocumentMetrics(snapshot.metrics);
            setSavedContentBytes(saved.contentBytes ?? null);
          }
          if (pending.current) {
            if (mounted.current) setSaveState('pending');
            // Editor changes already reset this timer in `schedule`. Preserve
            // that debounce instead of saving immediately when this request ends.
            if (!saveTimer.current) queueMicrotask(flush);
          } else if (mounted.current) {
            setSaveState('saved');
          }
        },
        onError: () => {
          saveInFlight.current = false;
          pending.current = true;
          if (mounted.current) setSaveState('error');
        },
      }
    );
  }, [editor, material.id, updateDocumentMetrics]);
  saveShortcutRef.current = flush;

  const schedule = useCallback(() => {
    pending.current = true;
    setSaveState('pending');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 5000);
  }, [flush]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      flush();
    };
  }, [flush]);

  // Kept intentionally cheap: it runs on every value change while typing.
  // Slate's own normalization is incremental (dirty paths only), and repairs
  // plus validation are deferred to the debounced `flush`.
  function onEditorChange() {
    if (applyingDiscussionMarks.current) return;
    scheduleMetricsRefresh();
    if (mode === 'suggestion') {
      setSuggestionDraftDirty(true);
      return;
    }
    schedule();
  }

  return (
    <NoteBlockDialogsProvider>
      <div className="flex h-full flex-col">
        {/* onValueChange, not onChange: the latter also fires for selection-only
            operations (caret moves), which must not schedule saves. */}
        <Plate editor={editor} onValueChange={onEditorChange}>
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
              // Documents on this path came from parse/create helpers and are
              // already normalized; a read-only count is enough.
              const metrics = countMaterialMetrics(document.value);
              revisionRef.current = revision;
              setBaseSnapshot({ document, metrics, revision });
              updateDocumentMetrics(metrics);
            }}
          >
            <NoteToolbar
              right={mode === 'edit' && allowExternalAssets ? <VoiceButton /> : undefined}
            />
            <div className="mb-20 min-h-0 flex-1 overflow-auto">
              <NoteEditorContent />
              <DocumentStatsFooter metrics={documentMetrics} contentBytes={savedContentBytes} />
            </div>
            <FloatingToolbar />
            {allowExternalAssets && <AiMenu />}
          </CollaborationProvider>
        </Plate>
      </div>
    </NoteBlockDialogsProvider>
  );
}
