import { useEffect, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Panel, RightRail } from '@/components/app/layout';
import { TopInsetBar } from '@/components/app/TopInsetBar';
import {
  Button,
  Icon,
  Menu,
  SegmentedControl,
  Spinner,
  Text,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { colorPair } from '@/lib/workspaceColor';
import {
  useAddChapter,
  useAddSource,
  useChapters,
  useDeleteChapter,
  useFile,
  useFiles,
  useReorderChapters,
  useUpdateChapter,
  useWorkspace,
} from '@/api/hooks';
import { FileViewer } from '@/features/files/FileViewer';
import { AddSourceModal } from '@/features/workspace/AddSourceModal';
import { ChatPanel } from '@/features/workspace/ChatPanel';
import { GeneratePanel } from '@/features/workspace/GeneratePanel';
import { m } from '@/i18n';

export default function WorkspaceOpen() {
  const params = useParams({ strict: false });
  const workspaceId = (params as { workspaceId: string }).workspaceId;

  const { data: ws } = useWorkspace(workspaceId);
  const { data: chapters } = useChapters(workspaceId);
  const { data: files } = useFiles(workspaceId);
  const addSource = useAddSource(workspaceId);
  const addChapter = useAddChapter(workspaceId);
  const updateChapter = useUpdateChapter(workspaceId);
  const reorder = useReorderChapters(workspaceId);
  const delChapter = useDeleteChapter(workspaceId);

  const [openFileId, setOpenFileId] = useState<string | null>(null);
  const [mode, setMode] = useState('chat');
  const [adding, setAdding] = useState(false);
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!openFileId && files?.length) setOpenFileId(files[0].id);
  }, [files, openFileId]);

  const { data: openFile } = useFile(openFileId);
  const pair = ws ? colorPair(ws.color) : null;
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
            <Icon name="chevronLeft" size={15} /> {m.workspace_back()}
          </Link>
          <Text variant="section" className="text-inherit">
            {ws?.name ?? '…'}
          </Text>
          <button
            onClick={() => setAdding(true)}
            className="hover:bg-surface-hover-bg mt-3 flex w-full items-center justify-center gap-2 rounded-button bg-surface px-3 py-2.5 text-sm font-semibold text-fg"
          >
            <Icon name="plus" size={16} /> {m.action_add_source()}
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-card-lg border border-line bg-rail">
          <div className="t-label px-4 pt-4 pb-2 text-fg-muted">Content</div>
          <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
            {!chapters && (
              <div className="grid place-items-center py-8">
                <Spinner />
              </div>
            )}
            {chapters?.map((ch, idx) => {
              const expanded = openChapters[ch.id] ?? true;
              return (
                <div key={ch.id} className="mb-0.5">
                  <div className="hover:bg-surface-hover-bg flex items-center gap-1 rounded-row px-2 py-1.5">
                    <button
                      onClick={() =>
                        setOpenChapters((s) => ({ ...s, [ch.id]: !expanded }))
                      }
                      className="text-fg-muted"
                    >
                      <Icon
                        name={expanded ? 'chevronDown' : 'chevronRight'}
                        size={15}
                      />
                    </button>
                    <span className="flex-1 truncate text-sm font-semibold text-fg">
                      {ch.name}
                    </span>
                    <Menu
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
                  {expanded &&
                    filesFor(ch.id).map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setOpenFileId(f.id)}
                        className={cn(
                          'ml-6 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-row px-2 py-1.5 text-left text-sm',
                          openFileId === f.id
                            ? 'bg-surface-hover-bg font-medium text-fg'
                            : 'hover:bg-surface-hover-bg text-fg-soft'
                        )}
                      >
                        <Icon name="files" size={15} />{' '}
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                </div>
              );
            })}

            {unfiled.length > 0 && (
              <div className="mt-2 mb-0.5">
                <div className="t-label px-2 pb-1 text-fg-muted">Unfiled</div>
                {unfiled.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setOpenFileId(f.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-row px-2 py-1.5 text-left text-sm',
                      openFileId === f.id
                        ? 'bg-surface-hover-bg font-medium text-fg'
                        : 'hover:bg-surface-hover-bg text-fg-soft'
                    )}
                  >
                    <Icon name="files" size={15} />{' '}
                    <span className="truncate">{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              const n = prompt('New chapter name');
              if (n) addChapter.mutate(n);
            }}
            className="hover:bg-surface-hover-bg m-2 flex items-center justify-center gap-2 rounded-button border border-dashed border-line-strong py-2 text-sm font-medium text-fg-soft"
          >
            <Icon name="plus" size={15} /> {m.action_add_chapter()}
          </button>
        </div>
      </div>

      {/* Center: file viewer */}
      <Panel className="flex-1">
        <div className="flex items-center gap-2 border-b border-divider px-5 py-3">
          <Icon name="files" size={18} className="text-fg-soft" />
          <Text variant="subtitle" className="truncate">
            {openFile?.name ?? 'No file open'}
          </Text>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-6">
          <FileViewer file={openFile ?? null} />
        </div>
      </Panel>

      {/* Right column: top bar + AI */}
      <RightRail width={380}>
        <TopInsetBar />
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
              <GeneratePanel
                workspaceId={workspaceId}
                chapters={chapters ?? []}
              />
            )}
          </div>
        </Panel>
      </RightRail>

      <AddSourceModal
        open={adding}
        onClose={() => setAdding(false)}
        chapters={chapters ?? []}
        onAdd={(list) => list.forEach((f) => addSource.mutate(f))}
      />
    </div>
  );
}
