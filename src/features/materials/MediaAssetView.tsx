import { useEffect, useState } from 'react';
import { FileText, LoaderCircle } from 'lucide-react';
import { resolveEditorAsset } from '@/api/editorAssets';

/** Persisted media node shape (img/video/audio/file elements). */
export interface MediaAssetNode {
  type: string;
  assetId?: string;
  name?: string;
  width?: string | number;
}

type AssetState =
  | { status: 'loading' }
  | { status: 'ready'; url: string; name: string; contentType: string }
  | { status: 'error'; message: string };

export function useResolvedAsset(assetId: string | undefined) {
  const [state, setState] = useState<AssetState>({ status: 'loading' });

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

/** Presentational media renderer shared by the editable node component and the
 * static preview. Resolves the asset URL and renders by media type. */
export function MediaAssetView({ element }: { element: MediaAssetNode }) {
  const asset = useResolvedAsset(element.assetId);
  return (
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
  );
}
