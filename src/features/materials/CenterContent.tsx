import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Icon,
  IconButton,
  type IconName,
  ProgressBar,
  SegmentedControl,
  Spinner,
} from '@/components/ui';
import { useFile, useMaterial } from '@/api/hooks';
import { FileViewer } from '@/features/files/FileViewer';
import {
  clampImageZoom,
  IMAGE_MAX_ZOOM,
  IMAGE_MIN_ZOOM,
  IMAGE_ZOOM_STEP,
  isImageFile,
} from '@/features/files/fileUtils';
import { QuizPreview } from './QuizPreview';
import { DeckPreview } from './DeckPreview';
import { MaterialPreview } from './MaterialPreview';
import type { OpenItem } from './openItem';
import { type MaterialKind, UserColor } from '@/api/types';

/* The editable Plate editor is by far the heaviest chunk in this route; only
 * load it when the user actually switches a material into Edit mode. */
const NoteEditor = lazy(() =>
  import('@/features/notes/NoteEditor').then((m) => ({ default: m.NoteEditor }))
);

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
  const [imageZoom, setImageZoom] = useState(IMAGE_MIN_ZOOM);
  const [materialMode, setMaterialMode] = useState<MaterialMode | null>(null);

  useEffect(() => {
    setImageZoom(IMAGE_MIN_ZOOM);
    setMaterialMode(null);
  }, [item?.kind, item?.id]);

  if (!item) {
    return <EmptyCenter />;
  }
  return (
    <>
      <Header
        item={item}
        imageZoom={imageZoom}
        onImageZoomChange={setImageZoom}
        materialMode={materialMode}
        onMaterialModeChange={setMaterialMode}
        readOnly={readOnly}
      />
      <div className="relative min-h-0 flex-1 overflow-auto">
        {item.kind === 'material' && (
          <MaterialBody
            key={item.id}
            materialId={item.id}
            readOnly={readOnly}
            mode={materialMode}
          />
        )}
        {item.kind === 'file' && (
          <FileBody
            color={color}
            fileId={item.id}
            imageZoom={imageZoom}
            onImageZoomChange={setImageZoom}
          />
        )}
      </div>
    </>
  );
}

type MaterialMode = 'study' | 'preview' | 'edit';

/** Default mode: notes → edit, quiz/flashcards → study, everything else →
 * inert preview. The editable Plate editor is lazy-loaded and only mounts
 * when Edit is active. */
function MaterialBody({
  materialId,
  readOnly,
  mode,
}: {
  materialId: string;
  readOnly: boolean;
  mode: MaterialMode | null;
}) {
  const { data: material, isLoading, isError } = useMaterial(materialId);
  if (isLoading) {
    return <FileLoading />;
  }
  if (isError || !material) {
    return <FileError />;
  }
  const activeMode = mode ?? defaultMaterialMode(material.kind);

  return (
    <div className="h-full min-h-0">
      {activeMode === 'study' && material.kind === 'quiz' && (
        <QuizPreview quizId={materialId} readOnly={readOnly} />
      )}
      {activeMode === 'study' && material.kind === 'flashcards' && (
        <DeckPreview deckId={materialId} readOnly={readOnly} />
      )}
      {activeMode === 'preview' && (
        <div className="h-full overflow-auto">
          <MaterialPreview content={material.content} className="mx-auto max-w-175" />
        </div>
      )}
      {activeMode === 'edit' && (
        <Suspense fallback={<FileLoading />}>
          <NoteEditor materialId={materialId} readOnly={readOnly} />
        </Suspense>
      )}
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
          <Icon name="files" className="size-7" />
          <p>Select a file or material to view it here.</p>
        </div>
      </div>
    </>
  );
}

function Header({
  item,
  imageZoom,
  onImageZoomChange,
  materialMode,
  onMaterialModeChange,
  readOnly,
}: {
  item: OpenItem;
  imageZoom: number;
  onImageZoomChange: (next: number) => void;
  materialMode: MaterialMode | null;
  onMaterialModeChange: (mode: MaterialMode) => void;
  readOnly: boolean;
}) {
  // TODO: magic wand for summary/AI related stuff, then some tool box? same action menu
  const { icon, title, showImageZoom, modeOptions, defaultMode } = useHeader(item, readOnly);
  const activeMode = materialMode ?? defaultMode;
  return (
    <div className="flex h-14 items-center gap-3 border-b border-divider px-5 py-4">
      <Icon name={icon} className="size-5.5" />
      <h2 className="t-subtitle min-w-0 flex-1 translate-y-px truncate">{title ?? '--'}</h2>
      {modeOptions && activeMode && (
        <SegmentedControl
          size="sm"
          options={modeOptions}
          value={activeMode}
          onChange={(value) => onMaterialModeChange(value as MaterialMode)}
        />
      )}
      {showImageZoom && (
        <div className="flex items-center gap-0.5">
          <IconButton
            icon="zoomOut"
            size="sm"
            variant="ghost-hover"
            strokeWidth={1.5}
            className="p-1.5"
            label="Zoom out"
            disabled={imageZoom <= IMAGE_MIN_ZOOM}
            onClick={() => onImageZoomChange(clampImageZoom(imageZoom - IMAGE_ZOOM_STEP))}
          />
          <IconButton
            icon="zoomIn"
            size="sm"
            variant="ghost-hover"
            strokeWidth={1.5}
            className="p-1.5"
            label="Zoom in"
            disabled={imageZoom >= IMAGE_MAX_ZOOM}
            onClick={() => onImageZoomChange(clampImageZoom(imageZoom + IMAGE_ZOOM_STEP))}
          />
        </div>
      )}
    </div>
  );
}

function defaultMaterialMode(kind: MaterialKind): MaterialMode {
  if (kind === 'note') return 'edit';
  if (kind === 'quiz' || kind === 'flashcards') return 'study';
  return 'preview';
}

function materialModeOptions(
  kind: MaterialKind,
  readOnly: boolean
): { value: string; label: string }[] {
  const hasStudyView = kind === 'quiz' || kind === 'flashcards';
  return [
    ...(hasStudyView
      ? [{ value: 'study', label: kind === 'quiz' ? 'Take quiz' : 'Study cards' }]
      : []),
    { value: 'preview', label: 'Preview' },
    { value: 'edit', label: readOnly ? 'Open document' : 'Edit' },
  ];
}

function materialIcon(kind: MaterialKind): IconName {
  switch (kind) {
    case 'diagram':
      return 'grid';
    case 'quiz':
      return 'quiz';
    case 'flashcards':
      return 'flashcards';
    case 'note':
      return 'notes';
    case 'mindmap':
    default:
      return 'workspaces';
  }
}

function useHeader(
  item: OpenItem,
  readOnly: boolean
): {
  icon: IconName;
  title?: string;
  showImageZoom: boolean;
  modeOptions?: { value: string; label: string }[];
  defaultMode?: MaterialMode;
} {
  const file = useFile(item.kind === 'file' ? item.id : null);
  const material = useMaterial(item.kind === 'material' ? item.id : null);
  if (item.kind === 'file') {
    return {
      icon: 'files',
      title: file.data?.name,
      showImageZoom: !!file.data && isImageFile(file.data),
    };
  }
  const mt = material.data;
  if (!mt) return { icon: 'workspaces', title: undefined, showImageZoom: false };
  return {
    icon: materialIcon(mt.kind),
    title: mt.title,
    showImageZoom: false,
    modeOptions: materialModeOptions(mt.kind, readOnly),
    defaultMode: defaultMaterialMode(mt.kind),
  };
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
      <p className="mt-3">Unable to load file. Please refresh and try again.</p>
    </div>
  );
}

export function FileEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 font-semibold text-solid-error">
      <p className="mt-3">The file is empty or corrupted. Please reupload and try again.</p>
    </div>
  );
}

function FileBody({
  fileId,
  color,
  imageZoom,
  onImageZoomChange,
}: {
  fileId: string;
  color?: UserColor;
  imageZoom: number;
  onImageZoomChange: (next: number) => void;
}) {
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
  return (
    <FileViewer file={file ?? null} imageZoom={imageZoom} onImageZoomChange={onImageZoomChange} />
  );
}
