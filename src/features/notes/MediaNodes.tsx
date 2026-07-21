import { useCallback, useEffect, useRef, useState } from 'react';
import { PlaceholderPlugin, PlaceholderProvider, updateUploadHistory } from '@platejs/media/react';
import type { TPlaceholderElement } from 'platejs';
import { KEYS } from 'platejs';
import {
  PlateElement,
  type PlateElementProps,
  useEditorPlugin,
  useEditorRef,
  withHOC,
} from 'platejs/react';
import { FileAudio, FileText, FileVideo, Image, LoaderCircle, Upload, X } from 'lucide-react';
import { useFilePicker } from 'use-file-picker';
import { uploadEditorAsset } from '@/api/editorAssets';
import { MediaAssetView, type MediaAssetNode } from '@/features/materials/MediaAssetView';
import { cn } from '@/lib/cn';
import { useEditorRuntime } from './EditorRuntime';
import { canCreateExternalEditorAssets } from './editorMode';
import { insertEditorNode } from './insertEditorNode';
import {
  MEDIA_ACCEPT,
  acceptsPurpose,
  editorAssetPurpose,
  mediaNodeFromAsset,
  plateMediaType,
} from './media';

type MediaType = ReturnType<typeof plateMediaType>;

const PLACEHOLDER_COPY: Record<MediaType, { label: string; icon: typeof Image }> = {
  img: { label: 'Add an image', icon: Image },
  audio: { label: 'Add audio', icon: FileAudio },
  video: { label: 'Add video', icon: FileVideo },
  file: { label: 'Add a file', icon: FileText },
};

function purposeForMediaType(type: string) {
  if (type === KEYS.img) return 'image' as const;
  if (type === KEYS.audio) return 'audio' as const;
  if (type === KEYS.video) return 'video' as const;
  return 'file' as const;
}

export const MediaPlaceholderElement = withHOC(
  PlaceholderProvider,
  function MediaPlaceholderElement(props: PlateElementProps<TPlaceholderElement>) {
    const { editor, element } = props;
    const { workspaceId, mode, allowExternalAssets } = useEditorRuntime();
    const canCreateAssets = canCreateExternalEditorAssets(mode, allowExternalAssets);
    const { api } = useEditorPlugin(PlaceholderPlugin);
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const mediaType = (element.mediaType || KEYS.file) as MediaType;
    const purpose = purposeForMediaType(mediaType);
    const content = PLACEHOLDER_COPY[mediaType] ?? PLACEHOLDER_COPY.file;
    const Icon = content.icon;

    const replaceCurrentPlaceholder = useCallback(
      async (file: File) => {
        if (!canCreateAssets) return;
        if (!acceptsPurpose(file, purpose)) {
          setError(`Choose a ${purpose} file.`);
          return;
        }
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setUploading(file);
        setProgress(0);
        setError(null);
        api.placeholder.addUploadingFile(element.id as string, file);
        try {
          const asset = await uploadEditorAsset(workspaceId, file, editorAssetPurpose(file), {
            signal: controller.signal,
            onProgress: setProgress,
          });
          const path = editor.api.findPath(element);
          if (!path) return;
          const node = { ...mediaNodeFromAsset(asset), placeholderId: element.id as string };
          editor.tf.withoutSaving(() => {
            editor.tf.removeNodes({ at: path });
            editor.tf.insertNodes(node, { at: path });
            updateUploadHistory(editor, node);
          });
          api.placeholder.removeUploadingFile(element.id as string);
        } catch (cause) {
          if (!controller.signal.aborted) {
            setError(cause instanceof Error ? cause.message : 'Upload failed');
          }
        } finally {
          if (abortRef.current === controller) abortRef.current = null;
          setUploading(null);
        }
      },
      [api.placeholder, canCreateAssets, editor, element, purpose, workspaceId]
    );

    const { openFilePicker } = useFilePicker({
      accept: [MEDIA_ACCEPT[purpose]],
      multiple: true,
      onFilesSelected: ({ plainFiles }) => {
        if (!canCreateAssets) return;
        const [first, ...rest] = plainFiles;
        if (first) void replaceCurrentPlaceholder(first);
        if (rest.length) editor.getTransforms(PlaceholderPlugin).insert.media(rest);
      },
    });

    useEffect(() => {
      if (!canCreateAssets) return;
      const dropped = api.placeholder.getUploadingFile(element.id as string);
      if (dropped) void replaceCurrentPlaceholder(dropped);
      return () => abortRef.current?.abort();
    }, [api.placeholder, canCreateAssets, element.id, replaceCurrentPlaceholder]);

    return (
      <PlateElement {...props} className="my-2">
        <div
          contentEditable={false}
          className={cn(
            'flex min-h-18 items-center gap-3 rounded-card border border-dashed border-line bg-surface-hover-bg px-4 py-3',
            canCreateAssets && !uploading && 'cursor-pointer hover:border-line-strong'
          )}
          onClick={() => canCreateAssets && !uploading && openFilePicker()}
          onKeyDown={(event) => {
            if (canCreateAssets && !uploading && (event.key === 'Enter' || event.key === ' ')) {
              openFilePicker();
            }
          }}
          role={canCreateAssets ? 'button' : undefined}
          tabIndex={canCreateAssets ? 0 : undefined}
        >
          {uploading ? (
            <LoaderCircle className="size-5 animate-spin text-action-accent" />
          ) : (
            <Icon className="size-5 text-fg-muted" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">
              {uploading?.name ?? content.label}
            </p>
            <p className={cn('text-xs text-fg-muted', error && 'text-solid-error')}>
              {error ??
                (uploading
                  ? `${progress}% uploaded`
                  : canCreateAssets
                    ? 'Choose, paste, or drop a file'
                    : 'Uploads are unavailable in suggestion mode')}
            </p>
            {uploading && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-divider">
                <div
                  className="h-full bg-action-accent transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
          {uploading ? (
            <button
              type="button"
              className="rounded-row p-1 text-fg-muted hover:bg-surface"
              aria-label="Cancel upload"
              onClick={(event) => {
                event.stopPropagation();
                abortRef.current?.abort();
              }}
            >
              <X className="size-4" />
            </button>
          ) : canCreateAssets ? (
            <Upload className="size-4 text-fg-muted" />
          ) : null}
        </div>
        {props.children}
      </PlateElement>
    );
  }
);

export function MediaAssetElement(props: PlateElementProps) {
  const element = props.element as unknown as MediaAssetNode;
  return (
    <PlateElement {...props} className="my-3">
      <MediaAssetView element={element} />
      {props.children}
    </PlateElement>
  );
}

/** Exposed for the toolbar and slash menu. */
export function insertMediaPlaceholder(editor: ReturnType<typeof useEditorRef>, type: MediaType) {
  insertEditorNode(editor, {
    type: KEYS.placeholder,
    mediaType: type,
    children: [{ text: '' }],
  });
}
