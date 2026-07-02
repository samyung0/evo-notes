import { useEffect, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Panel, RightRail } from '@/components/app/layout';
import { TopInsetBar } from '@/components/app/TopInsetBar';
import {
  Button,
  HoverActions,
  Icon,
  ProgressBar,
  SegmentedControl,
  SkeletonList,
  Text,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { userColorPair } from '@/lib/userColor';
import {
  useAddChapter,
  useChapters,
  useDeleteChapter,
  useFile,
  useFiles,
  useIngestProgress,
  useReorderChapters,
  useUpdateChapter,
  useWorkspace,
} from '@/api/hooks';
import type { SourceFile } from '@/api/types';
import { FileViewer } from '@/features/files/FileViewer';
import { ChatPanel } from '@/features/workspace/ChatPanel';
import { GeneratePanel } from '@/features/workspace/GeneratePanel';
import { useDialogs } from '@/stores/dialogs';
import { m } from '@/i18n';

/** A file row in the workspace sidebar. Shows a progress bar while the source is
 * being ingested and an error state if it failed. */
function FileListItem({
  file,
  active,
  onOpen,
}: {
  file: SourceFile;
  active: boolean;
  onOpen: (id: string) => void;
}) {
  const processing = file.status === 'processing';
  const failed = file.status === 'failed';
  return (
    <div className="flex flex-col">
      <button
        onClick={() => !processing && onOpen(file.id)}
        disabled={processing}
        className={cn(
          'flex w-full items-center gap-2 rounded-row px-1.5 py-2 text-left text-sm',
          active
            ? 'bg-surface-hover-bg font-medium text-fg'
            : 'text-fg-secondary hover:bg-surface-hover-bg',
          processing && 'cursor-default'
        )}
      >
        <Icon name="files" size={15} className={failed ? 'text-solid-error' : undefined} />
        <span className="flex-1 translate-y-px truncate">{file.name}</span>
        {failed && <span className="t-label text-solid-error">failed</span>}
      </button>
      {processing && (
        <div className="mr-1.5 mb-0.5 ml-6">
          <ProgressBar value={file.ingestPct ?? 0} height={4} />
        </div>
      )}
    </div>
  );
}

export default function WorkspaceOpen() {
  const params = useParams({ strict: false });
  const workspaceId = (params as { workspaceId: string }).workspaceId;

  const { data: ws } = useWorkspace(workspaceId); // todo: throw error if not found, show error page
  const { data: chapters } = useChapters(workspaceId);
  const { data: files } = useFiles(workspaceId);
  useIngestProgress(workspaceId);
  const addChapter = useAddChapter(workspaceId);
  const updateChapter = useUpdateChapter(workspaceId);
  const reorder = useReorderChapters(workspaceId);
  const delChapter = useDeleteChapter(workspaceId);
  const openAddSource = useDialogs((s) => s.openAddSource);

  const [openFileId, setOpenFileId] = useState<string | null>(null);
  const [mode, setMode] = useState('chat');
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (openFileId || !files?.length) return;
    const first = files.find((f) => f.status !== 'processing' && f.status !== 'failed') ?? files[0];
    setOpenFileId(first.id);
  }, [files, openFileId]);

  const { data: openFile } = useFile(openFileId);
  const pair = ws ? userColorPair(ws.color) : null;
  const unfiled = files?.filter((f) => f.chapterId === null) ?? [];

  function filesFor(chapterId: string) {
    return files?.filter((f) => f.chapterId === chapterId) ?? [];
  }
  function moveChapter(idx: number, dir: -1 | 1) {
    if (!chapters) return;
    const ids = chapters.map((c) => c.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    reorder.mutate(ids);
  }

  return (
    <div className="flex h-full min-h-0 gap-2.5">
      {/* Left column */}
      <div className="flex w-[278px] shrink-0 flex-col gap-2.5">
        <div
          className="rounded-card-lg p-4"
          style={pair ? { background: pair.bg, color: pair.fg } : undefined}
        >
          <Link
            to="/workspaces"
            preload="intent"
            className="mb-3 inline-flex items-center gap-1 text-sm font-semibold opacity-80 hover:opacity-100"
          >
            <Icon name="chevronLeft" size={15} className="-translate-y-px" /> {m.workspace_back()}
          </Link>
          <h2 className="t-section line-clamp-4 wrap-break-word text-ellipsis text-inherit">
            {ws?.name ?? '…'}
          </h2>
          <Button
            variant="surface"
            size="md"
            onClick={() => openAddSource(workspaceId)}
            className="mt-4 w-full py-2"
          >
            <Icon name="plus" size={16} /> {m.action_add_file()}
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-card-lg border border-line bg-rail p-1">
          <div className="t-label px-3.5 pt-3 pb-1 text-fg-muted">Content</div>
          <div className="min-h-0 flex-1 overflow-auto px-1.5 pb-1.5">
            {!chapters && <SkeletonList count={5} rowHeight={36} className="px-1.5 py-2" />}
            <div className="flex flex-col py-2">
              {chapters?.map((ch, idx) => {
                const expanded = openChapters[ch.id] ?? true;
                return (
                  <div key={ch.id}>
                    <div className="group relative flex items-center rounded-row py-2 pr-8 hover:bg-surface-hover-bg">
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
                            active={openFileId === f.id}
                            onOpen={setOpenFileId}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {unfiled.length > 0 && (
                <div className="mt-3">
                  <div className="t-label px-1.5 py-1.5 text-fg-muted">Unfiled</div>
                  {unfiled.map((f) => (
                    <FileListItem
                      key={f.id}
                      file={f}
                      active={openFileId === f.id}
                      onOpen={setOpenFileId}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const n = prompt('New chapter name');
              if (n) addChapter.mutate(n);
            }}
            className="m-2 py-2"
          >
            <Icon name="plus" size={15} /> {m.action_add_chapter()}
          </Button>
        </div>
      </div>

      {/* Center: file viewer */}
      <Panel className="flex-1" sectionClassName="h-full">
        <div className="flex items-center gap-3 border-b border-divider px-5 py-4">
          <Icon name="files" className="size-5.5" />
          <h3 className="t-subtitle translate-y-px truncate">{openFile?.name ?? '--'}</h3>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {openFile?.status === 'processing' ? (
            <div className="grid h-full place-items-center text-fg-muted">
              <div className="flex w-64 -translate-y-1/2 flex-col items-center gap-3">
                <Icon name="sparkles" size={28} />
                <p className="t-body text-fg-muted">Processing {openFile.name}…</p>
                <ProgressBar value={openFile.ingestPct ?? 0} showLabel className="w-full" />
              </div>
            </div>
          ) : openFile?.status === 'failed' ? (
            <div className="grid h-full -translate-y-1/2 place-items-center text-solid-error">
              <p className="t-body">Processing failed for {openFile.name}.</p>
            </div>
          ) : (
            <FileViewer file={openFile ?? null} />
          )}
        </div>
      </Panel>

      {/* Right column: top bar + AI */}
      <RightRail className="w-80 xl:w-120">
        <TopInsetBar className="w-full" />
        <Panel className="min-h-0 flex-1">
          <div className="flex items-center justify-between border-b border-divider px-3 py-2.5">
            <SegmentedControl
              size="sm"
              options={[
                { value: 'chat', label: 'Chat' },
                { value: 'generate', label: 'Generate' },
              ]}
              value={mode}
              onChange={setMode}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {mode === 'chat' ? (
              <ChatPanel workspaceId={workspaceId} />
            ) : (
              <GeneratePanel workspaceId={workspaceId} chapters={chapters ?? []} />
            )}
          </div>
        </Panel>
      </RightRail>
    </div>
  );
}
