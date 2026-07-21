import { useState } from 'react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Panel } from '@/components/app/layout';
import { TopInsetBar } from '@/components/app/TopInsetBar';
import {
  Button,
  HoverActions,
  Icon,
  IconButton,
  type IconName,
  SegmentedControl,
  SkeletonList,
  Spinner,
  Tabs,
  Text,
  userToast,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { userColorPair } from '@/lib/userColor';
import {
  useAddChapter,
  useChapters,
  useCloneWorkspace,
  useCreateNote,
  useDeleteChapter,
  useDeleteMaterial,
  useFiles,
  useIngestProgress,
  useMaterials,
  useMoveFile,
  useMoveMaterial,
  useReorderChapters,
  useUpdateChapter,
  useUpdateWorkspaceSharing,
  useWorkspace,
} from '@/api/hooks';
import type { Chapter, MaterialRef, MaterialRefType } from '@/api/types';
import { FileListItem } from '@/features/files/FileListItem';
import { CenterContent } from '@/features/materials/CenterContent';
import {
  openItemFromSearch,
  searchFromOpenItem,
  type OpenItem,
  type WorkspaceOpenSearch,
} from '@/features/materials/openItem';
import { ChatPanel } from '@/features/workspace/ChatPanel';
import { GeneratePanel } from '@/features/workspace/GeneratePanel';
import type { GenerateMode } from '@/features/workspace/GenerateFormDialog';
import { MoveToChapterDialog } from '@/features/workspace/MoveToChapterDialog';
import { useDialogs } from '@/stores/dialogs';
import { m } from '@/i18n';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable';
import { ShareDialog } from '@/components/app/ShareDialog';
import { PrivateOrUnavailable } from '@/components/app/PrivateOrUnavailable';
import { canShareWorkspace, isWorkspaceReadOnly } from '@/features/workspace/access';
import { isApiError } from '@/api/client';
import { toastCloneError } from '@/lib/authToasts';
import { LoadingLarge } from '@/components/app/LoadingLarge';

const MATERIAL_ICON: Record<MaterialRefType, IconName> = {
  mindmap: 'workspaces',
  diagram: 'grid',
  quiz: 'quiz',
  deck: 'flashcards',
  note: 'write',
};

const GENERATING_MATERIAL: Record<GenerateMode, { type: MaterialRefType; title: string }> = {
  flashcards: { type: 'deck', title: 'Generating flashcards…' },
  quiz: { type: 'quiz', title: 'Generating quiz…' },
  mindmap: { type: 'mindmap', title: 'Generating mindmap…' },
  diagram: { type: 'diagram', title: 'Generating diagram…' },
};

function MaterialListItem({
  data: matRef,
  active,
  onOpen,
  onDelete,
  chapters,
  onMove,
  generating = false,
  readOnly = false,
}: {
  data: MaterialRef;
  active: boolean;
  onOpen: () => void;
  onDelete?: () => void;
  /** All workspace chapters, for the "Move to…" menu. */
  chapters: Chapter[];
  /** File this material under a chapter (null = unfile). */
  onMove?: (chapterId: string | null) => void;
  generating?: boolean;
  readOnly?: boolean;
}) {
  const [moveOpen, setMoveOpen] = useState(false);
  const items = [
    { label: 'Move to chapter…', icon: 'files' as IconName, onClick: () => setMoveOpen(true) },
    ...(onDelete
      ? [{ label: m.action_delete(), icon: 'trash' as IconName, danger: true, onClick: onDelete }]
      : []),
  ];
  return (
    <div
      draggable={!readOnly && !generating}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-evo-material', matRef.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={cn(
        'group relative flex items-center rounded-row hover:bg-surface-hover-bg',
        generating ? 'pr-1' : 'pr-8',
        active && 'bg-surface-hover-bg'
      )}
    >
      <button
        onClick={onOpen}
        disabled={generating}
        className={cn(
          'flex w-full items-center gap-2 rounded-row px-1.5 py-1.5 text-left',
          active && 'font-bold'
        )}
      >
        <Icon name={MATERIAL_ICON[matRef.type]} size={15} />
        <span className="line-clamp-2 flex-1 translate-y-px">{matRef.title}</span>
        {generating && <Spinner className="size-4 shrink-0" />}
      </button>
      {!readOnly && !generating && (
        <>
          <HoverActions className="absolute top-1/2 right-1 -translate-y-1/2" items={items} />
          <MoveToChapterDialog
            open={moveOpen}
            onClose={() => setMoveOpen(false)}
            chapters={chapters}
            currentChapterId={matRef.chapterId}
            onSelect={(chapterId) => onMove?.(chapterId)}
          />
        </>
      )}
    </div>
  );
}

export default function WorkspaceOpen() {
  const params = useParams({ strict: false });
  const workspaceId = (params as { workspaceId: string }).workspaceId;
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as WorkspaceOpenSearch;

  const {
    data: ws,
    isLoading: wsLoading,
    isError: wsError,
    error: wsErr,
  } = useWorkspace(workspaceId);
  const { data: chapters } = useChapters(workspaceId);
  const { data: files } = useFiles(workspaceId);
  const { data: materials } = useMaterials(workspaceId);
  const readOnly = isWorkspaceReadOnly(ws?.capabilities);
  const canShare = canShareWorkspace(ws?.capabilities);
  useIngestProgress(workspaceId, !readOnly);
  const addChapter = useAddChapter(workspaceId);
  const updateChapter = useUpdateChapter(workspaceId);
  const reorder = useReorderChapters(workspaceId);
  const delChapter = useDeleteChapter(workspaceId);
  const delMaterial = useDeleteMaterial(workspaceId);
  const moveMaterial = useMoveMaterial(workspaceId);
  const moveFile = useMoveFile(workspaceId);
  const createNote = useCreateNote(workspaceId);
  const cloneWorkspace = useCloneWorkspace();
  const updateSharing = useUpdateWorkspaceSharing();
  const openAddSource = useDialogs((s) => s.openAddSource);
  const openConfirm = useDialogs((s) => s.openConfirm);

  const openItem = openItemFromSearch(search);
  const [suggestionDirty, setSuggestionDirty] = useState(false);

  function setOpenItem(item: OpenItem | null) {
    const changingItem = item?.kind !== openItem?.kind || item?.id !== openItem?.id;
    if (
      changingItem &&
      suggestionDirty &&
      !window.confirm('Discard the unsubmitted suggestion draft and open another item?')
    ) {
      return;
    }
    if (changingItem) setSuggestionDirty(false);
    navigate({
      to: '.',
      search: searchFromOpenItem(item),
      replace: true,
    });
  }

  const [generating, setGenerating] = useState<GenerateMode | null>(null);
  const [mode, setMode] = useState('chat');
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  // Drop-target highlight while dragging a material. 'unfiled' = the flat list.
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const pair = userColorPair(ws?.color);
  const unfiled = files?.filter((f) => f.chapterId === null) ?? [];
  const unfiledMaterials = materials?.filter((mt) => mt.chapterId == null) ?? [];

  function filesFor(chapterId: string) {
    return files?.filter((f) => f.chapterId === chapterId) ?? [];
  }
  function materialsFor(chapterId: string) {
    return materials?.filter((mt) => mt.chapterId === chapterId) ?? [];
  }
  // Native drag-and-drop: a material or file row carries its id; chapters (and
  // the unfiled buckets) are drop zones that re-file whichever was dropped.
  const DND_TYPES = ['application/x-evo-material', 'application/x-evo-file'];
  function onItemDrop(chapterId: string | null, e: React.DragEvent) {
    if (readOnly) return;
    e.preventDefault();
    setDropTarget(null);
    const matId = e.dataTransfer.getData('application/x-evo-material');
    if (matId) {
      moveMaterial.mutate({ id: matId, chapterId });
      return;
    }
    const fileId = e.dataTransfer.getData('application/x-evo-file');
    if (fileId) moveFile.mutate({ id: fileId, chapterId });
  }
  function dropZone(key: string, chapterId: string | null) {
    if (readOnly) return {};
    return {
      onDragOver: (e: React.DragEvent) => {
        if (DND_TYPES.some((t) => e.dataTransfer.types.includes(t))) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (dropTarget !== key) setDropTarget(key);
        }
      },
      onDragLeave: (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setDropTarget((t) => (t === key ? null : t));
      },
      onDrop: (e: React.DragEvent) => onItemDrop(chapterId, e),
    };
  }
  function renderMaterial(mt: MaterialRef) {
    return (
      <MaterialListItem
        key={`${mt.type}:${mt.id}`}
        data={mt}
        active={openItem?.kind === 'material' && openItem.id === mt.id}
        onOpen={() => setOpenItem({ kind: 'material', id: mt.id })}
        chapters={chapters ?? []}
        onMove={(chapterId) => moveMaterial.mutate({ id: mt.id, chapterId })}
        readOnly={readOnly}
        onDelete={
          !readOnly
            ? () => {
                openConfirm({
                  title: m.confirm_delete_title({ name: mt.title }),
                  body: m.confirm_delete_body(),
                  danger: true,
                  onConfirm: () =>
                    delMaterial.mutate(mt.id, {
                      onSuccess: () => {
                        if (openItem?.kind === 'material' && openItem.id === mt.id) {
                          setOpenItem(null);
                        }
                      },
                    }),
                });
              }
            : undefined
        }
      />
    );
  }
  function moveChapter(idx: number, dir: -1 | 1) {
    if (!chapters) return;
    const ids = chapters.map((c) => c.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    reorder.mutate(ids);
  }
  const isFileActive = (id: string) => openItem?.kind === 'file' && openItem.id === id;
  function onFileDeleted(id: string) {
    if (openItem?.kind === 'file' && openItem.id === id) setOpenItem(null);
  }

  if (wsLoading) {
    return (
      <LoadingLarge
        title="Loading workspace…"
        backTo="/workspaces"
        backLabel="Back to workspaces"
      />
    );
  }

  if (!wsLoading && (wsError || !ws)) {
    const denied = isApiError(wsErr) && (wsErr.status === 404 || wsErr.status === 401);
    return (
      <PrivateOrUnavailable
        title={denied ? 'This item is private or unavailable.' : 'Unable to load workspace.'}
        description={
          denied
            ? 'You may not have access, or the link may no longer be shared.'
            : 'Ooops, we are not able to load the workspace. Please try again in a bit.'
        }
        backTo="/workspaces"
        backLabel="Back to workspaces"
      />
    );
  }

  // overflow-visible WITH important is so that shadow doesnt get clipped
  return (
    <>
      <ResizablePanelGroup
        orientation="horizontal"
        className="flex h-full min-h-0 gap-1.5 overflow-visible!"
      >
        <ResizablePanel
          defaultSize="18%"
          minSize="250px"
          maxSize="550px"
          className="flex w-full flex-col gap-2.5 overflow-visible!"
        >
          {/* Left column */}
          <div
            className="rounded-card-lg p-4"
            style={{
              background: pair.bg === 'transparent' ? 'var(--color-surface-dark)' : pair.bg,
              color: pair.fg,
            }}
          >
            <Link
              to="/workspaces"
              preload="intent"
              className="mb-3 inline-flex items-center gap-1 text-sm font-semibold opacity-80 hover:opacity-100"
            >
              <Icon name="chevronLeft" size={15} className="-translate-y-px" /> {m.workspace_back()}
            </Link>
            <h1 className="t-section line-clamp-4 wrap-break-word text-ellipsis text-inherit">
              {ws?.name ?? '…'}
            </h1>
            {readOnly ? (
              <Button
                variant="surface"
                size="md"
                iconLeft="plus"
                disabled={cloneWorkspace.isPending}
                onClick={() =>
                  cloneWorkspace.mutate(workspaceId, {
                    onSuccess: ({ workspace, ragCloned }) => {
                      if (!ragCloned) {
                        userToast({
                          title: 'Workspace cloned',
                          description: 'Files copied. Parsed knowledge needs rebuilding.',
                          button: { label: 'Dismiss', onClick: () => {} },
                        });
                      }
                      navigate({
                        to: '/workspaces/$workspaceId',
                        params: { workspaceId: workspace.id },
                      });
                    },
                    onError: (err) => toastCloneError(err, 'workspace'),
                  })
                }
                className="mt-4 w-full py-2"
              >
                {cloneWorkspace.isPending ? 'Cloning…' : 'Clone workspace'}
              </Button>
            ) : (
              <div className={`mt-4 grid gap-2 ${canShare ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <Button
                  variant="surface"
                  size="md"
                  onClick={() => openAddSource(workspaceId)}
                  className="py-2"
                >
                  <Icon name="plus" size={16} className="-translate-y-px" /> {m.action_add_file()}
                </Button>
                {/* TODO: change share to settings or configure since there will be more workspace settings in future */}
                {canShare && (
                  <Button
                    variant="surface"
                    size="md"
                    iconLeft="link"
                    onClick={() => setShareOpen(true)}
                    className="py-2"
                  >
                    Share
                  </Button>
                )}
              </div>
            )}
          </div>

          <Panel className="min-h-0 flex-1 flex-col p-1" sectionClassName="h-full gap-0">
            <div className="min-h-0 flex-1 overflow-auto px-1.5 pt-0 pb-1.5">
              {!chapters && <SkeletonList count={5} rowHeight={36} className="px-1.5 py-2" />}
              {chapters && (
                <div className="flex flex-col gap-3 pt-1 pb-2">
                  <div className="flex flex-col">
                    <div className="relative flex items-center justify-between px-2 pt-3 pr-0 pb-1.5">
                      <div className="t-label text-fg-muted">Content</div>
                      {!readOnly && (
                        <div className="absolute top-1/2 right-0 flex -translate-y-1/2 gap-1">
                          <IconButton
                            icon="plus"
                            size={'xs'}
                            variant={'neutral'}
                            strokeWidth={1.5}
                            onClick={() =>
                              createNote.mutate(
                                {},
                                {
                                  onSuccess: (mt) => setOpenItem({ kind: 'material', id: mt.id }),
                                }
                              )
                            }
                            className="rounded-md px-1 py-1.5"
                          />
                          <IconButton
                            icon="collapseFolder"
                            size={'xs'}
                            variant={'neutral'}
                            strokeWidth={1.5}
                            onClick={() =>
                              setOpenChapters({
                                ...Object.fromEntries(chapters.map((c) => [c.id, false])),
                              })
                            }
                            className="rounded-md px-1 py-1.5"
                          />
                        </div>
                      )}
                    </div>
                    {chapters.map((ch, idx) => {
                      const expanded = openChapters[ch.id] ?? true;
                      return (
                        <div
                          key={ch.id}
                          {...dropZone(ch.id, ch.id)}
                          className={cn(
                            'rounded-row',
                            dropTarget === ch.id &&
                              'ring-accent bg-action-accent/40 ring-2 ring-inset'
                          )}
                        >
                          <div className="group relative flex items-center rounded-row py-1.5 pr-8 hover:bg-surface-hover-bg">
                            <button
                              onClick={() => setOpenChapters((s) => ({ ...s, [ch.id]: !expanded }))}
                              className="flex min-w-0 flex-1 items-center gap-1 px-1 text-left"
                            >
                              <Icon
                                name={expanded ? 'chevronDown' : 'chevronRight'}
                                size={15}
                                className="shrink-0 text-fg-muted"
                              />
                              <span className="translate-y-px truncate font-semibold">
                                {ch.name}
                              </span>
                            </button>
                            {!readOnly && (
                              <HoverActions
                                className="absolute top-1/2 right-1 -translate-y-1/2"
                                items={[
                                  {
                                    label: m.action_rename(),
                                    icon: 'write',
                                    onClick: () => {
                                      // TODO: use dialog
                                      const n = prompt('Rename chapter', ch.name);
                                      if (n) updateChapter.mutate({ id: ch.id, name: n });
                                    },
                                  },
                                  {
                                    label: 'Move up',
                                    icon: 'chevronLeft',
                                    onClick: () => moveChapter(idx, -1),
                                    disabled: idx === 0,
                                  },
                                  {
                                    label: 'Move down',
                                    icon: 'chevronRight',
                                    onClick: () => moveChapter(idx, 1),
                                    disabled: idx === chapters.length - 1,
                                  },
                                  {
                                    label: m.action_delete(),
                                    icon: 'trash',
                                    danger: true,
                                    onClick: () => delChapter.mutate(ch.id),
                                  },
                                ]}
                              />
                            )}
                          </div>
                          {expanded && (
                            <div className="flex flex-col pl-4">
                              {filesFor(ch.id).map((f) => (
                                <FileListItem
                                  key={f.id}
                                  file={f}
                                  color={ws?.color}
                                  active={isFileActive(f.id)}
                                  onOpen={(id) => setOpenItem({ kind: 'file', id })}
                                  workspaceId={workspaceId}
                                  chapters={chapters}
                                  onDeleted={onFileDeleted}
                                  readOnly={readOnly}
                                />
                              ))}
                              {materialsFor(ch.id).map(renderMaterial)}
                              {filesFor(ch.id).length === 0 && materialsFor(ch.id).length === 0 && (
                                <div className="px-1.5 py-1 text-xs text-fg-muted">Empty</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {(unfiled.length > 0 || unfiledMaterials.length > 0 || generating) && (
                    <div
                      {...dropZone('unfiled-files', null)}
                      className={cn(
                        'rounded-row',
                        dropTarget === 'unfiled-files' &&
                          'ring-accent bg-action-accent/40 ring-2 ring-inset'
                      )}
                    >
                      <div className="t-label px-1.5 py-1.5 text-fg-muted">Others</div>
                      <div>
                        {unfiled.map((f) => (
                          <FileListItem
                            key={f.id}
                            file={f}
                            color={ws?.color}
                            active={isFileActive(f.id)}
                            onOpen={(id) => setOpenItem({ kind: 'file', id })}
                            workspaceId={workspaceId}
                            chapters={chapters}
                            onDeleted={onFileDeleted}
                            readOnly={readOnly}
                          />
                        ))}
                        {unfiledMaterials.map(renderMaterial)}
                        {generating && (
                          <MaterialListItem
                            data={{
                              id: '__generating__',
                              type: GENERATING_MATERIAL[generating].type,
                              title: GENERATING_MATERIAL[generating].title,
                              chapterId: null,
                              createdAt: new Date().toISOString(),
                            }}
                            active={false}
                            onOpen={() => {}}
                            chapters={chapters}
                            generating
                            readOnly
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {!readOnly && (
              <Button
                variant="outline"
                onClick={() => {
                  const n = prompt('New chapter name');
                  if (n) addChapter.mutate(n);
                }}
                className="m-2 py-2"
              >
                <Icon name="plus" size={15} className="-translate-y-px" /> {m.action_add_chapter()}
              </Button>
            )}
          </Panel>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          defaultSize={readOnly ? '82%' : '52%'}
          minSize="400px"
          className="overflow-visible!"
        >
          {/* Center: content viewer */}
          <Panel className="w-full" sectionClassName="h-full gap-0">
            <CenterContent
              color={ws?.color}
              item={openItem}
              readOnly={readOnly}
              onSuggestionDirtyChange={setSuggestionDirty}
            />
          </Panel>
        </ResizablePanel>
        {!readOnly && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize="30%"
              minSize="350px"
              maxSize="900px"
              className="overflow-visible!"
            >
              {/* Right column: top bar + AI */}
              <div className="flex h-full w-full flex-col gap-2.5">
                <TopInsetBar className="w-full" />
                <Panel sectionClassName="gap-0 min-h-full overflow-hidden" className="flex-1">
                  <div className="flex items-center justify-between py-2.5">
                    <Tabs
                      tabs={[
                        { value: 'chat', label: 'Chat' },
                        { value: 'generate', label: 'Generate' },
                      ]}
                      value={mode}
                      onChange={setMode}
                      className="px-3"
                    />
                  </div>
                  <div className="h-full flex-1 overflow-hidden">
                    {mode === 'chat' ? (
                      <ChatPanel workspaceId={workspaceId} color={ws?.color} />
                    ) : (
                      <GeneratePanel
                        workspaceId={workspaceId}
                        chapters={chapters ?? []}
                        files={files ?? []}
                        onOpenItem={setOpenItem}
                        onGeneratingChange={setGenerating}
                      />
                    )}
                  </div>
                </Panel>
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      {ws && (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          title={`Share ${ws.name}`}
          privacy={ws.privacy}
          link={`/share/workspaces/${ws.id}`}
          saving={updateSharing.isPending}
          workspaceId={ws.id}
          shareRole={ws.shareRole ?? 'viewer'}
          onPrivacyChange={(privacy) => updateSharing.mutateAsync({ id: ws.id, privacy })}
          onShareRoleChange={(shareRole) => updateSharing.mutateAsync({ id: ws.id, shareRole })}
        />
      )}
    </>
  );
}
