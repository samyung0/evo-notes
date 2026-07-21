import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Button,
  Icon,
  IconButton,
  type IconName,
  ProgressBar,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@/components/ui';
import { useDeck, useFile, useMaterial, useQuiz } from '@/api/hooks';
import { FileViewer } from '@/features/files/FileViewer';
import {
  clampImageZoom,
  IMAGE_MAX_ZOOM,
  IMAGE_MIN_ZOOM,
  IMAGE_ZOOM_STEP,
  isImageFile,
} from '@/features/files/fileUtils';
import { MaterialPreview } from './MaterialPreview';
import type { MaterialDocument } from './document';
import {
  isInteractiveMaterialMode,
  materialModePolicy,
  resolveMaterialMode,
  type MaterialMode,
} from './modePolicy';
import type { OpenItem } from './openItem';
import { type MaterialKind, UserColor } from '@/api/types';
import {
  noteEditorStatusLabel,
  type NoteEditorStatus,
} from '@/features/notes/editorMode';
import { cn } from '@/lib/cn';

/* Interactive Plate is the heaviest chunk in this route. View and study modes
 * deliberately never load it. */
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
  onSuggestionDirtyChange,
}: {
  item: OpenItem | null;
  readOnly?: boolean;
  color?: UserColor;
  onSuggestionDirtyChange?: (dirty: boolean) => void;
}) {
  const [imageZoom, setImageZoom] = useState(IMAGE_MIN_ZOOM);
  const [materialMode, setMaterialMode] = useState<MaterialMode | null>(null);
  const [suggestionDirty, setSuggestionDirty] = useState(false);
  const [editorStatus, setEditorStatus] = useState<NoteEditorStatus | null>(null);
  const updateSuggestionDirty = useCallback(
    (dirty: boolean) => {
      setSuggestionDirty(dirty);
      onSuggestionDirtyChange?.(dirty);
    },
    [onSuggestionDirtyChange]
  );

  useEffect(() => {
    setImageZoom(IMAGE_MIN_ZOOM);
    setMaterialMode(null);
    updateSuggestionDirty(false);
    setEditorStatus(null);
  }, [item?.kind, item?.id, updateSuggestionDirty]);

  const changeMaterialMode = (nextMode: MaterialMode) => {
    if (
      suggestionDirty &&
      !window.confirm('Discard the unsubmitted suggestion draft and change modes?')
    ) {
      return;
    }
    updateSuggestionDirty(false);
    setEditorStatus(null);
    setMaterialMode(nextMode);
  };

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
        onMaterialModeChange={changeMaterialMode}
        editorStatus={editorStatus}
      />
      <div className="relative min-h-0 flex-1 overflow-auto">
        {item.kind === 'material' && (
          <MaterialBody
            key={item.id}
            materialId={item.id}
            mode={materialMode}
            allowExternalAssets={!readOnly}
            onSuggestionDirtyChange={updateSuggestionDirty}
            onEditorStatusChange={setEditorStatus}
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

const MATERIALMODE_ICON: Record<MaterialMode, IconName> = {
  view: 'eye',
  study: 'quiz',
  edit: 'write',
  suggestion: 'write',
};

const MATERIALMODE_LABEL: Record<MaterialMode, string> = {
  view: 'View',
  study: 'Study',
  edit: 'Edit',
  suggestion: 'Suggestion',
};

function MaterialBody({
  materialId,
  mode,
  allowExternalAssets,
  onSuggestionDirtyChange,
  onEditorStatusChange,
}: {
  materialId: string;
  mode: MaterialMode | null;
  allowExternalAssets: boolean;
  onSuggestionDirtyChange: (dirty: boolean) => void;
  onEditorStatusChange: (status: NoteEditorStatus | null) => void;
}) {
  const { data: material, isLoading, isError } = useMaterial(materialId);
  if (isLoading) {
    return <FileLoading />;
  }
  if (isError || !material) {
    return <FileError />;
  }
  const policy = materialModePolicy(material.kind, material.capabilities);
  const activeMode = resolveMaterialMode(mode, policy);

  return (
    <div className="h-full min-h-0">
      {activeMode === 'view' && (
        <div className="h-full min-h-0 overflow-auto">
          <MaterialPreview content={material.content} className="mx-auto max-w-175" />
        </div>
      )}
      {activeMode === 'study' && (
        <MaterialStudyView
          materialId={materialId}
          kind={material.kind}
          content={material.content}
        />
      )}
      {isInteractiveMaterialMode(activeMode) && (
        <Suspense fallback={<FileLoading />}>
          <NoteEditor
            key={`${materialId}:${activeMode}`}
            materialId={materialId}
            mode={activeMode}
            allowExternalAssets={allowExternalAssets}
            onSuggestionDirtyChange={onSuggestionDirtyChange}
            onEditorStatusChange={onEditorStatusChange}
          />
        </Suspense>
      )}
    </div>
  );
}

function MaterialStudyView({
  materialId,
  kind,
  content,
}: {
  materialId: string;
  kind: MaterialKind;
  content: string | MaterialDocument;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {kind === 'quiz' && <QuizPreviewActions quizId={materialId} />}
      {kind === 'flashcards' && <DeckPreviewActions deckId={materialId} />}
      <div className="min-h-0 flex-1 overflow-auto">
        <MaterialPreview content={content} className="mx-auto max-w-175" />
      </div>
    </div>
  );
}

function QuizPreviewActions({ quizId }: { quizId: string }) {
  const quiz = useQuiz(quizId);
  const navigate = useNavigate();
  const summary = quiz.data
    ? `${quiz.data.questions.length} questions`
    : quiz.isLoading
      ? 'Loading quiz details…'
      : 'Quiz';

  return (
    <div className="flex items-center gap-3 border-b border-divider px-6 py-3">
      <span className="t-meta min-w-0 flex-1 truncate text-fg-muted">{summary}</span>
      <Button
        size="sm"
        variant="accent"
        iconRight="arrowRight"
        onClick={() => navigate({ to: '/quizzes/$quizId/attempt', params: { quizId } })}
      >
        Start quiz
      </Button>
    </div>
  );
}

function DeckPreviewActions({ deckId }: { deckId: string }) {
  const deck = useDeck(deckId);
  const navigate = useNavigate();
  const summary = deck.data
    ? `${deck.data.cardCount} cards · ${deck.data.knownPct}% known`
    : deck.isLoading
      ? 'Loading deck details…'
      : 'Flashcards';

  return (
    <div className="flex items-center gap-3 border-b border-divider px-6 py-3">
      <span className="t-meta min-w-0 flex-1 truncate text-fg-muted">{summary}</span>
      <Button
        size="sm"
        variant="accent"
        iconRight="arrowRight"
        onClick={() => navigate({ to: '/flashcards/$deckId', params: { deckId } })}
      >
        Study
      </Button>
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
  editorStatus,
}: {
  item: OpenItem;
  imageZoom: number;
  onImageZoomChange: (next: number) => void;
  materialMode: MaterialMode | null;
  onMaterialModeChange: (mode: MaterialMode) => void;
  editorStatus: NoteEditorStatus | null;
}) {
  // TODO: magic wand for summary/AI related stuff, then some tool box? same action menu
  const { icon, title, showImageZoom, modeOptions, defaultMode } = useHeader(item);
  const activeMode =
    materialMode && modeOptions?.some((option) => option.value === materialMode)
      ? materialMode
      : defaultMode;
  const statusLabel = noteEditorStatusLabel(editorStatus);
  return (
    <div className="flex h-14 items-center gap-3 border-b border-divider px-5 py-4">
      <Icon name={icon} className="size-5.5" />
      <h2 className="t-subtitle min-w-0 flex-1 translate-y-px truncate">{title ?? '--'}</h2>
      <div className="ml-auto flex items-center gap-2">
        {statusLabel && (
          <span
            className={cn(
              'px-1 text-xs text-fg-muted',
              editorStatus?.mode === 'edit' &&
                editorStatus.saveState === 'error' &&
                'text-solid-error'
            )}
            role="status"
          >
            {statusLabel}
          </span>
        )}
        {modeOptions && modeOptions.length > 1 && activeMode && (
          <Select
            value={activeMode}
            onValueChange={(value) => onMaterialModeChange(value as MaterialMode)}
          >
            <SelectTrigger variant="noOutline">
              <SelectValue></SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {modeOptions.map((o) => (
                  <SelectItem size="sm" key={o.value} value={o.value} className="text-sm">
                    <div className="flex items-center gap-2">
                      <Icon name={MATERIALMODE_ICON[o.value]} className="size-4 -translate-y-px" />
                      <span>{o.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
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
    </div>
  );
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
      return 'write';
    case 'mindmap':
    default:
      return 'workspaces';
  }
}

function useHeader(item: OpenItem): {
  icon: IconName;
  title?: string;
  showImageZoom: boolean;
  modeOptions?: { value: MaterialMode; label: string }[];
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
    modeOptions: materialModePolicy(mt.kind, mt.capabilities).modes.map((value) => ({
      value,
      label: MATERIALMODE_LABEL[value],
    })),
    defaultMode: materialModePolicy(mt.kind, mt.capabilities).defaultMode,
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
