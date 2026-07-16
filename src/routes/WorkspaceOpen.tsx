import { useEffect, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
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
  Tabs,
  Text,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { userColorPair } from '@/lib/userColor';
import {
  useAddChapter,
  useChapters,
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
  useWorkspace,
} from '@/api/hooks';
import type { Chapter, MaterialRef, MaterialRefType } from '@/api/types';
import { FileListItem } from '@/features/files/FileListItem';
import { CenterContent } from '@/features/materials/CenterContent';
import type { OpenItem } from '@/features/materials/openItem';
import { ChatPanel } from '@/features/workspace/ChatPanel';
import { GeneratePanel } from '@/features/workspace/GeneratePanel';
import { MoveToChapterDialog } from '@/features/workspace/MoveToChapterDialog';
import { useDialogs } from '@/stores/dialogs';
import { m } from '@/i18n';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable';

const MATERIAL_ICON: Record<MaterialRefType, IconName> = {
  mindmap: 'workspaces',
  diagram: 'grid',
  quiz: 'quiz',
  deck: 'flashcards',
  note: 'notes',
};

function MaterialListItem({
  data: matRef,
  active,
  onOpen,
  onDelete,
  chapters,
  onMove,
}: {
  data: MaterialRef;
  active: boolean;
  onOpen: () => void;
  onDelete?: () => void;
  /** All workspace chapters, for the "Move to…" menu. */
  chapters: Chapter[];
  /** File this material under a chapter (null = unfile). */
  onMove: (chapterId: string | null) => void;
}) {
  // TODO: show generation process (like the file process bar), auto scroll to position after clicking on generation
  // TODO: reuse filelistitem instead
  const [moveOpen, setMoveOpen] = useState(false);
  const items = [
    { label: 'Move to chapter…', icon: 'files' as IconName, onClick: () => setMoveOpen(true) },
    ...(onDelete
      ? [{ label: m.action_delete(), icon: 'trash' as IconName, danger: true, onClick: onDelete }]
      : []),
  ];
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-evo-material', matRef.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="group relative flex items-center rounded-row pr-8 hover:bg-surface-hover-bg"
    >
      <button
        onClick={onOpen}
        className={cn(
          'flex w-full items-center gap-2 rounded-row px-1.5 py-1.5 text-left',
          active ? 'font-medium text-fg' : 'text-fg-secondary'
        )}
      >
        <Icon name={MATERIAL_ICON[matRef.type]} size={15} />
        <span className="flex-1 translate-y-px truncate">{matRef.title}</span>
      </button>
      <HoverActions className="absolute top-1/2 right-1 -translate-y-1/2" items={items} />
      <MoveToChapterDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        chapters={chapters}
        currentChapterId={matRef.chapterId}
        onSelect={onMove}
      />
    </div>
  );
}

export default function WorkspaceOpen() {
  const params = useParams({ strict: false });
  const workspaceId = (params as { workspaceId: string }).workspaceId;

  const { data: ws } = useWorkspace(workspaceId);
  const { data: chapters } = useChapters(workspaceId);
  const { data: files } = useFiles(workspaceId);
  const { data: materials } = useMaterials(workspaceId);
  useIngestProgress(workspaceId);
  const addChapter = useAddChapter(workspaceId);
  const updateChapter = useUpdateChapter(workspaceId);
  const reorder = useReorderChapters(workspaceId);
  const delChapter = useDeleteChapter(workspaceId);
  const delMaterial = useDeleteMaterial(workspaceId);
  const moveMaterial = useMoveMaterial(workspaceId);
  const moveFile = useMoveFile(workspaceId);
  const createNote = useCreateNote(workspaceId);
  const openAddSource = useDialogs((s) => s.openAddSource);

  const [openItem, setOpenItem] = useState<OpenItem | null>(null);
  const [mode, setMode] = useState('chat');
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  // Drop-target highlight while dragging a material. 'unfiled' = the flat list.
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Auto-open the first ready file when nothing is selected yet.
  useEffect(() => {
    if (openItem || !files?.length) return;
    const first = files.find((f) => f.status !== 'processing' && f.status !== 'failed') ?? files[0];
    setOpenItem({ kind: 'file', id: first.id });
  }, [files, openItem]);

  const pair = userColorPair(ws?.color);
  const unfiled = files?.filter((f) => f.chapterId === null) ?? [];
  const unfiledMaterials = materials?.filter((mt) => mt.chapterId == null) ?? [];

  function filesFor(chapterId: string) {
    return files?.filter((f) => f.chapterId === chapterId) ?? [];
  }
  function materialsFor(chapterId: string) {
    return materials?.filter((mt) => mt.chapterId === chapterId) ?? [];
  }
  // Quizzes/decks have their own delete flows elsewhere; only these are
  // deletable from this list (matches prior behavior). Moving applies to all.
  const canDelete = (t: MaterialRefType) => t === 'mindmap' || t === 'diagram' || t === 'note';

  // Native drag-and-drop: a material or file row carries its id; chapters (and
  // the unfiled buckets) are drop zones that re-file whichever was dropped.
  const DND_TYPES = ['application/x-evo-material', 'application/x-evo-file'];
  function onItemDrop(chapterId: string | null, e: React.DragEvent) {
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
    return {
      onDragOver: (e: React.DragEvent) => {
        if (DND_TYPES.some((t) => e.dataTransfer.types.includes(t))) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (dropTarget !== key) setDropTarget(key);
        }
      },
      onDragLeave: (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget((t) => (t === key ? null : t));
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
        onDelete={
          canDelete(mt.type)
            ? () => {
                delMaterial.mutate(mt.id);
                if (openItem?.kind === 'material' && openItem.id === mt.id) setOpenItem(null);
              }
            : undefined
        }
      />
    );
  }
  // TODO: drag and drop
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

  // overflow-visible WITH important is so that shadow doesnt get clipped
  return (
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
          <Button
            variant="surface"
            size="md"
            onClick={() => openAddSource(workspaceId)}
            className="mt-4 w-full py-2"
          >
            <Icon name="plus" size={16} className="-translate-y-px" /> {m.action_add_file()}
          </Button>
        </div>

        <Panel className="min-h-0 flex-1 flex-col p-1" sectionClassName="h-full gap-0">
          <div className="min-h-0 flex-1 overflow-auto px-1.5 pt-0 pb-1.5">
            {!chapters && <SkeletonList count={5} rowHeight={36} className="px-1.5 py-2" />}
            {chapters && (
              <div className="flex flex-col gap-3 pt-1 pb-2">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between px-2 pt-1.5 pr-0 pb-1.5">
                    <div className="t-label text-fg-muted">Content</div>
                    <div>
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
                  </div>
                  {chapters.map((ch, idx) => {
                    const expanded = openChapters[ch.id] ?? true;
                    return (
                      <div
                        key={ch.id}
                        {...dropZone(ch.id, ch.id)}
                        className={cn(
                          'rounded-row',
                          dropTarget === ch.id && 'ring-2 ring-accent ring-inset bg-action-accent/40'
                        )}
                      >
                        <div className="group relative flex items-center rounded-row py-1.5 pr-8 hover:bg-surface-hover-bg">
                          <button
                            onClick={() => setOpenChapters((s) => ({ ...s, [ch.id]: !expanded }))}
                            className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 text-left"
                          >
                            <Icon
                              name={expanded ? 'chevronDown' : 'chevronRight'}
                              size={15}
                              className="shrink-0 text-fg-muted"
                            />
                            <span className="translate-y-px truncate font-semibold">{ch.name}</span>
                          </button>
                          <HoverActions
                            className="absolute top-1/2 right-1 -translate-y-1/2"
                            items={[
                              {
                                label: m.action_rename(),
                                icon: 'notes',
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
                        </div>
                        {expanded && (
                          <div className="flex flex-col pl-4">
                            {filesFor(ch.id).map((f) => (
                              <FileListItem
                                key={f.id}
                                file={f}
                                active={isFileActive(f.id)}
                                onOpen={(id) => setOpenItem({ kind: 'file', id })}
                                workspaceId={workspaceId}
                                chapters={chapters}
                                onDeleted={onFileDeleted}
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

                {unfiled.length > 0 && (
                  <div
                    {...dropZone('unfiled-files', null)}
                    className={cn(
                      'rounded-row',
                      dropTarget === 'unfiled-files' && 'ring-2 ring-accent ring-inset bg-action-accent/40'
                    )}
                  >
                    <div className="t-label px-1.5 py-1.5 text-fg-muted">Others</div>
                    <div>
                      {unfiled.map((f) => (
                        <FileListItem
                          key={f.id}
                          file={f}
                          active={isFileActive(f.id)}
                          onOpen={(id) => setOpenItem({ kind: 'file', id })}
                          workspaceId={workspaceId}
                          chapters={chapters}
                          onDeleted={onFileDeleted}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Study materials — unfiled (not yet moved into a chapter).
                    Drag onto a chapter above, or use the row's "Move to…" menu.
                    Dropping here unfiles a material. */}
                <div
                  {...dropZone('unfiled', null)}
                  className={cn(
                    'rounded-row',
                    dropTarget === 'unfiled' && 'ring-2 ring-accent ring-inset bg-action-accent/40'
                  )}
                >
                  <div className="flex items-center justify-between px-1.5 py-1.5">
                    <span className="t-label text-fg-muted">Study materials</span>
                    <button
                      onClick={() =>
                        createNote.mutate(
                          {},
                          {
                            onSuccess: (mt) => setOpenItem({ kind: 'material', id: mt.id }),
                          }
                        )
                      }
                      disabled={createNote.isPending}
                      className="inline-flex items-center gap-1 rounded-row px-1.5 py-0.5 text-xs font-medium text-fg-secondary hover:bg-surface-hover-bg hover:text-fg disabled:opacity-50"
                    >
                      <Icon name="plus" size={13} /> Write note
                    </button>
                  </div>
                  {unfiledMaterials.length ? (
                    unfiledMaterials.map(renderMaterial)
                  ) : (
                    <div className="px-1.5 py-2 text-xs text-fg-muted">
                      {materials?.length
                        ? 'All materials are filed under chapters.'
                        : 'Generate flashcards, quizzes, mindmaps, or diagrams — or write your own note.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
        </Panel>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="52%" minSize="400px" className="overflow-visible!">
        {/* Center: content viewer */}
        <Panel className="w-full" sectionClassName="h-full">
          <CenterContent item={openItem} />
        </Panel>
      </ResizablePanel>
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
                />
              )}
            </div>
          </Panel>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
