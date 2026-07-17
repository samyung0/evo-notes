import { useState } from 'react';
import {
  Button,
  ConfirmDialog,
  HoverActions,
  Icon,
  Input,
  ProgressBar,
  SimpleDialog,
  Spinner,
  Text,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { useDeleteFile, useMoveFile, useUpdateFile } from '@/api/hooks';
import type { Chapter, SourceFile, UserColor } from '@/api/types';
import { MoveToChapterDialog } from '@/features/workspace/MoveToChapterDialog';
import { m } from '@/i18n';

function formatSize(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

/** A file row in the workspace sidebar. Opens the file in the center pane, shows
 * ingest progress, and exposes a hover action menu (rename / properties /
 * delete) mirroring the chapter row pattern. */
export function FileListItem({
  file,
  active,
  onOpen,
  workspaceId,
  color,
  chapters = [],
  onDeleted,
  readOnly = false,
}: {
  file: SourceFile;
  active: boolean;
  onOpen: (id: string) => void;
  workspaceId: string;
  /** Workspace chapters, for the "Move to chapter…" picker. */
  chapters?: Chapter[];
  color?: UserColor;
  onDeleted?: (id: string) => void;
  /** Shared workspace viewers can open files but cannot mutate them. */
  readOnly?: boolean;
}) {
  const processing = file.status === 'processing';
  const failed = file.status === 'failed';
  const updateFile = useUpdateFile(workspaceId);
  const moveFile = useMoveFile(workspaceId);
  const delFile = useDeleteFile(workspaceId);

  const [renameOpen, setRenameOpen] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [name, setName] = useState(file.name);

  return (
    <div className="flex flex-col">
      <div
        draggable={!processing && !readOnly}
        onDragStart={(e) => {
          e.dataTransfer.setData('application/x-evo-file', file.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        className={cn(
          'group relative flex items-center rounded-row pr-8 hover:bg-surface-hover-bg',
          active && 'bg-surface-hover-bg'
        )}
      >
        <button
          onClick={() => !processing && onOpen(file.id)}
          disabled={processing}
          className={cn(
            'flex w-full items-center gap-2 rounded-row px-1.5 py-1.5 text-left',
            active && 'font-bold',
            processing && 'cursor-default'
          )}
        >
          <Icon name="files" size={15} className={cn(failed && 'text-solid-error')} />
          <span className={cn('line-clamp-2 flex-1 translate-y-px', failed && 'text-solid-error')}>
            {file.name}
          </span>
        </button>
        {processing && (
          <div className="mr-0.5">
            <Spinner />
          </div>
        )}
        {!readOnly && (
          <HoverActions
            className="absolute top-1/2 right-1 -translate-y-1/2"
            iconContainerClassName="hover:bg-unset"
            items={[
              {
                label: m.action_rename(),
                icon: 'notes',
                onClick: () => {
                  setName(file.name);
                  setRenameOpen(true);
                },
              },
              {
                label: 'Move File',
                icon: 'files',
                onClick: () => setMoveOpen(true),
              },
              {
                label: 'Properties',
                icon: 'help',
                onClick: () => setPropsOpen(true),
              },
              {
                label: m.action_delete(),
                icon: 'trash',
                danger: true,
                onClick: () => setConfirmOpen(true),
              },
            ]}
          />
        )}
      </div>
      {failed && (
        <div className="pl-2 text-xs font-medium text-solid-error">Error Processing File</div>
      )}
      {processing && (
        <div className="mr-1.5 mb-0.5 ml-6">
          <ProgressBar tone={color} value={file.ingestPct ?? 0} height={4} />
        </div>
      )}

      <SimpleDialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rename file"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const n = name.trim();
                if (n) updateFile.mutate({ id: file.id, name: n });
                setRenameOpen(false);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </SimpleDialog>

      <SimpleDialog open={propsOpen} onClose={() => setPropsOpen(false)} title="File properties">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <Row label="Name" value={file.name} />
          <Row label="Type" value={file.kind.toUpperCase()} />
          <Row label="Size" value={formatSize(file.sizeKb)} />
          <Row label="Status" value={file.status ?? 'ready'} />
          <Row label="Added" value={new Date(file.addedAt).toLocaleString()} />
        </dl>
      </SimpleDialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          delFile.mutate(file.id);
          onDeleted?.(file.id);
        }}
        title={`Delete ${file.name}?`}
        body="This removes the file from the workspace. This cannot be undone."
      />

      <MoveToChapterDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        chapters={chapters}
        color={color}
        currentChapterId={file.chapterId}
        onSelect={(chapterId) => moveFile.mutate({ id: file.id, chapterId })}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <p className="text-fg-muted">{label}</p>
      <p className="truncate">{value}</p>
    </>
  );
}
