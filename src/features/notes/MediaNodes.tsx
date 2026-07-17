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
import { resolveEditorAsset, uploadEditorAsset } from '@/api/editorAssets';
import { cn } from '@/lib/cn';
import { useEditorRuntime } from './EditorRuntime';
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
    const { workspaceId } = useEditorRuntime();
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
      [api.placeholder, editor, element, purpose, workspaceId]
    );

    const { openFilePicker } = useFilePicker({
      accept: [MEDIA_ACCEPT[purpose]],
      multiple: true,
      onFilesSelected: ({ plainFiles }) => {
        const [first, ...rest] = plainFiles;
        if (first) void replaceCurrentPlaceholder(first);
        if (rest.length) editor.getTransforms(PlaceholderPlugin).insert.media(rest);
      },
    });

    useEffect(() => {
      const dropped = api.placeholder.getUploadingFile(element.id as string);
      if (dropped) void replaceCurrentPlaceholder(dropped);
      return () => abortRef.current?.abort();
    }, [api.placeholder, element.id, replaceCurrentPlaceholder]);

    return (
      <PlateElement {...props} className="my-2">
        <div
          contentEditable={false}
          className={cn(
            'flex min-h-18 items-center gap-3 rounded-card border border-dashed border-line bg-surface-hover-bg px-4 py-3',
            !uploading && 'cursor-pointer hover:border-line-strong'
          )}
          onClick={() => !uploading && openFilePicker()}
          onKeyDown={(event) => {
            if (!uploading && (event.key === 'Enter' || event.key === ' ')) openFilePicker();
          }}
          role="button"
          tabIndex={0}
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
              {error ?? (uploading ? `${progress}% uploaded` : 'Choose, paste, or drop a file')}
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
          ) : (
            <Upload className="size-4 text-fg-muted" />
          )}
        </div>
        {props.children}
      </PlateElement>
    );
  }
);

function useResolvedAsset(assetId: string | undefined) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'ready'; url: string; name: string; contentType: string }
    | { status: 'error'; message: string }
  >({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    if (!assetId) {
      setState({ status: 'error', message: 'Missing asset reference' });
      return () => controller.abort();
    }
    setState({ status: 'loading' });
    void resolveEditorAsset(assetId, controller.signal)
      .then((asset) =>
        setState({
          status: 'ready',
          url: asset.url,
          name: asset.name,
          contentType: asset.contentType,
        })
      )
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: cause instanceof Error ? cause.message : 'Unable to load asset',
          });
        }
      });
    return () => controller.abort();
  }, [assetId]);

  return state;
}

export function MediaAssetElement(props: PlateElementProps) {
  const element = props.element as {
    type: MediaType;
    assetId?: string;
    name?: string;
    width?: string | number;
  };
  const asset = useResolvedAsset(element.assetId);

  return (
    <PlateElement {...props} className="my-3">
      <figure contentEditable={false} className="group relative m-0">
        {asset.status === 'loading' && (
          <div className="grid min-h-24 place-items-center rounded-card border border-line bg-surface-hover-bg">
            <LoaderCircle className="size-5 animate-spin text-fg-muted" />
          </div>
        )}
        {asset.status === 'error' && (
          <div className="rounded-card border border-solid-error/30 bg-tint-error px-3 py-4 text-sm text-solid-error">
            {asset.message}
          </div>
        )}
        {asset.status === 'ready' && element.type === 'img' && (
          <img
            src={asset.url}
            alt={element.name || asset.name}
            className="mx-auto h-auto max-w-full rounded-card"
            style={{ width: element.width }}
          />
        )}
        {asset.status === 'ready' && element.type === 'video' && (
          <video
            src={asset.url}
            controls
            className="mx-auto max-h-[70vh] max-w-full rounded-card"
            style={{ width: element.width }}
          />
        )}
        {asset.status === 'ready' && element.type === 'audio' && (
          <audio src={asset.url} controls className="w-full" />
        )}
        {asset.status === 'ready' && element.type === 'file' && (
          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-card border border-line bg-surface-hover-bg px-3 py-2 text-sm text-fg hover:border-line-strong"
          >
            <FileText className="size-4 text-fg-muted" />
            <span className="truncate">{element.name || asset.name}</span>
          </a>
        )}
      </figure>
      {props.children}
    </PlateElement>
  );
}

/** Exposed for the toolbar and slash menu. */
export function insertMediaPlaceholder(editor: ReturnType<typeof useEditorRef>, type: MediaType) {
  editor.tf.insertNodes({
    type: KEYS.placeholder,
    mediaType: type,
    children: [{ text: '' }],
  });
}
