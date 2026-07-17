import { useState } from 'react';
import {
  Icon,
  Skeleton,
  type IconName,
  ProgressBar,
  SegmentedControl,
  Text,
  Spinner,
} from '@/components/ui';
import { useFile, useMaterial } from '@/api/hooks';
import { FileViewer } from '@/features/files/FileViewer';
import { NoteEditor } from '@/features/notes/NoteEditor';
import { QuizPreview } from './QuizPreview';
import { DeckPreview } from './DeckPreview';
import type { OpenItem } from './openItem';
import { UserColor } from '@/api/types';
import { cn } from '@/lib/cn';

/** The center pane. Dispatches on the currently-open item — a source file or a
 * study material — and renders a consistent header plus the item body. Quiz and
 * flashcards materials get action-rich previews; mindmaps/diagrams render inline.
 * User-authored notes take over the whole pane with the editable Plate editor. */
export function CenterContent({
  item,
  readOnly = false,
  color,
}: {
  item: OpenItem | null;
  readOnly?: boolean;
  color?: UserColor;
}) {
  if (!item) {
    return <EmptyCenter />;
  }
  return (
    <>
      <Header item={item} />
      <div className="relative h-full flex-1 overflow-auto">
        {item.kind === 'material' && <MaterialBody materialId={item.id} readOnly={readOnly} />}
        {item.kind === 'file' && <FileBody color={color} fileId={item.id} />}
      </div>
    </>
  );
}

/** Notes render full-bleed (own title + toolbar + scroll); other materials keep
 * the shared header + padded body. */
function MaterialBody({ materialId, readOnly }: { materialId: string; readOnly: boolean }) {
  const { data: material, isLoading, isError } = useMaterial(materialId);
  const [mode, setMode] = useState<'study' | 'document'>('study');
  if (isLoading) {
    return <FileLoading />;
  }
  if (isError || !material) {
    return <FileError />;
  }
  const hasStudyView = material.kind === 'quiz' || material.kind === 'flashcards';
  const showDocument = !hasStudyView || mode === 'document';

  return (
    <div className="flex h-full min-h-0 flex-col">
      {hasStudyView && (
        <div className="flex justify-end border-b border-divider px-3 py-2">
          <SegmentedControl
            size="sm"
            options={[
              { value: 'study', label: material.kind === 'quiz' ? 'Take quiz' : 'Study cards' },
              { value: 'document', label: 'Edit & annotate' },
            ]}
            value={mode}
            onChange={(value) => setMode(value as 'study' | 'document')}
          />
        </div>
      )}
      <div className="min-h-0 flex-1">
        {showDocument && <NoteEditor materialId={materialId} readOnly={readOnly} />}
        {!showDocument && material.kind === 'quiz' && (
          <QuizPreview quizId={materialId} readOnly={readOnly} />
        )}
        {!showDocument && material.kind === 'flashcards' && (
          <DeckPreview deckId={materialId} readOnly={readOnly} />
        )}
      </div>
    </div>
  );
}

function EmptyCenter() {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-divider px-5 py-4">
        <Icon name="files" className="size-5.5" />
        <h2 className="t-subtitle translate-y-px truncate">--</h2>
      </div>
      <div className="grid flex-1 place-items-center p-6">
        <div className="flex flex-col items-center gap-2">
          <Icon name="files" className="size-8" />
          <p>Select a file or material to view it here.</p>
        </div>
      </div>
    </>
  );
}

function Header({ item }: { item: OpenItem }) {
  // TODO: magic wand for summary/AI related stuff, then some tool box? zoomin/out, same action menu
  const { icon, title } = useHeader(item);
  return (
    <div className="flex items-center gap-3 border-b border-divider px-5 py-4">
      <Icon name={icon} className="size-5.5" />
      <h2 className="t-subtitle translate-y-px truncate">{title ?? '--'}</h2>
    </div>
  );
}

function useHeader(item: OpenItem): { icon: IconName; title?: string } {
  const file = useFile(item.kind === 'file' ? item.id : null);
  const material = useMaterial(item.kind === 'material' ? item.id : null);
  if (item.kind === 'file') return { icon: 'files', title: file.data?.name };
  const mt = material.data;
  if (!mt) return { icon: 'workspaces', title: undefined };
  switch (mt.kind) {
    case 'diagram':
      return { icon: 'grid', title: mt.title };
    case 'quiz':
      return { icon: 'quiz', title: mt.title };
    case 'flashcards':
      return { icon: 'flashcards', title: mt.title };
    default:
      return { icon: 'workspaces', title: mt.title };
  }
}

export function FileLoading() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-3">
      <Spinner />
      <p>Loading preview...</p>
    </div>
  );
}

export function FileError() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 font-semibold text-solid-error">
      <p className="mt-3">Unable to Load file. Please refresh and try again.</p>
    </div>
  );
}

function FileBody({ fileId, color }: { fileId: string; color?: UserColor }) {
  const { data: file, isLoading, isError } = useFile(fileId);
  if (isLoading) return <FileLoading />;
  if (!isLoading && isError) return <FileError />;
  if (file?.status === 'processing') {
    return (
      <div className="grid h-full place-items-center">
        <div className="flex w-64 -translate-y-1/2 flex-col items-center gap-3">
          <Icon name="sparkles" className="size-7" />
          <p>Processing {file.name}…</p>
          <ProgressBar tone={color} value={file.ingestPct ?? 0} showLabel className="w-full" />
        </div>
      </div>
    );
  }
  if (file?.status === 'failed') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 font-semibold text-solid-error">
        <p className="mt-3">Unable to process file {file.name}.</p>
      </div>
    );
  }
  return <FileViewer file={file ?? null} />;
}
