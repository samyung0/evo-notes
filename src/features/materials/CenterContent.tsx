import { Icon, Skeleton, type IconName, ProgressBar, Text } from '@/components/ui';
import { useFile, useMaterial } from '@/api/hooks';
import { FileViewer } from '@/features/files/FileViewer';
import { NoteEditor } from '@/features/notes/NoteEditor';
import { MaterialView } from './MaterialView';
import { QuizPreview } from './QuizPreview';
import { DeckPreview } from './DeckPreview';
import type { OpenItem } from './openItem';

/** The center pane. Dispatches on the currently-open item — a source file or a
 * study material — and renders a consistent header plus the item body. Quiz and
 * flashcards materials get action-rich previews; mindmaps/diagrams render inline.
 * User-authored notes take over the whole pane with the editable Plate editor. */
export function CenterContent({ item }: { item: OpenItem | null }) {
  if (!item) {
    return <EmptyCenter />;
  }
  if (item.kind === 'material') {
    return <MaterialCenter materialId={item.id} />;
  }
  return (
    <>
      <Header item={item} />
      <div className="flex-1 overflow-auto p-6">
        <Body item={item} />
      </div>
    </>
  );
}

/** Notes render full-bleed (own title + toolbar + scroll); other materials keep
 * the shared header + padded body. */
function MaterialCenter({ materialId }: { materialId: string }) {
  const { data: material, isLoading } = useMaterial(materialId);
  if (isLoading || !material) {
    return (
      <>
        <div className="flex items-center gap-3 border-b border-divider px-5 py-4">
          <Icon name="workspaces" className="size-5.5" />
          <h2 className="t-subtitle translate-y-px truncate">--</h2>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <Skeleton className="h-full min-h-[40vh] w-full" />
        </div>
      </>
    );
  }
  if (material.kind === 'note') {
    return (
      <div className="h-full min-h-0">
        <NoteEditor materialId={materialId} />
      </div>
    );
  }
  return (
    <>
      <Header item={{ kind: 'material', id: materialId }} />
      <div className="flex-1 overflow-auto p-6">
        <MaterialBody materialId={materialId} />
      </div>
    </>
  );
}

function EmptyCenter() {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-divider px-5 py-4">
        <Icon name="files" className="size-5.5" />
        <h2 className="t-subtitle translate-y-px truncate">--</h2>
      </div>
      <div className="grid flex-1 place-items-center p-6 text-fg-muted">
        <div className="flex flex-col items-center gap-2">
          <Icon name="files" size={32} />
          <Text variant="body" tone="muted">
            Select a file or material to view it here.
          </Text>
        </div>
      </div>
    </>
  );
}

function Header({ item }: { item: OpenItem }) {
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

function Body({ item }: { item: OpenItem }) {
  if (item.kind === 'file') return <FileBody fileId={item.id} />;
  return <MaterialBody materialId={item.id} />;
}

function MaterialBody({ materialId }: { materialId: string }) {
  const { data: material, isLoading } = useMaterial(materialId);
  if (isLoading || !material) return <Skeleton className="h-full min-h-[40vh] w-full" />;
  if (material.kind === 'quiz') return <QuizPreview quizId={materialId} />;
  if (material.kind === 'flashcards') return <DeckPreview deckId={materialId} />;
  return <MaterialView materialId={materialId} />;
}

function FileBody({ fileId }: { fileId: string }) {
  const { data: file } = useFile(fileId);
  if (file?.status === 'processing') {
    return (
      <div className="grid h-full place-items-center text-fg-muted">
        <div className="flex w-64 -translate-y-1/2 flex-col items-center gap-3">
          <Icon name="sparkles" size={28} />
          <p className="t-body text-fg-muted">Processing {file.name}…</p>
          <ProgressBar value={file.ingestPct ?? 0} showLabel className="w-full" />
        </div>
      </div>
    );
  }
  if (file?.status === 'failed') {
    return (
      <div className="grid h-full -translate-y-1/2 place-items-center text-solid-error">
        <p className="t-body">Processing failed for {file.name}.</p>
      </div>
    );
  }
  return <FileViewer file={file ?? null} />;
}
