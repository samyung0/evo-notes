import { lazy, Suspense, type ReactNode } from 'react';
import { Icon, Skeleton, Spinner } from '@/components/ui';
import type { SourceFile } from '@/api/types';
import { PlateMarkdown } from '@/features/materials/PlateMarkdown';
import { FileLoading } from '../materials/CenterContent';

const PdfView = lazy(() => import('./PdfView'));
const SheetView = lazy(() => import('./SheetView'));
const DocxView = lazy(() => import('./DocxView'));

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'jp2', 'webp', 'gif', 'bmp', 'svg', 'avif']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac']);
const SHEET_EXTS = new Set(['xlsx', 'xls', 'csv']);

function fileExt(name: string) {
  return name.includes('.') ? (name.split('.').pop()?.toLowerCase() ?? '') : '';
}

function lazyView(node: ReactNode) {
  return <Suspense fallback={<FileLoading />}>{node}</Suspense>;
}

function UnsupportedPreview({ file }: { file: SourceFile }) {
  const ext = fileExt(file.name);
  return (
    <div className="grid h-full place-items-center">
      <div className="flex max-w-sm flex-col items-center gap-2 text-center">
        <Icon name="files" size={32} />
        <p className="t-subtitle">Preview not available</p>
        <p className="t-meta text-fg-muted">
          {ext ? `.${ext}` : 'This'} files can't be previewed yet.
          {file.url ? ' You can still download the original file.' : ''}
        </p>
        {file.url && (
          <a
            href={file.url}
            download={file.name}
            className="t-meta font-medium text-action underline underline-offset-2"
          >
            Download {file.name}
          </a>
        )}
      </div>
    </div>
  );
}

export function FileViewer({ file }: { file: SourceFile | null }) {
  if (!file) {
    return (
      <div className="grid h-full place-items-center">
        <div className="flex flex-col items-center gap-2">
          <Icon name="files" size={32} />
          <p>Select a file to read it here.</p>
        </div>
      </div>
    );
  }

  const ext = fileExt(file.name);

  if ((file.kind === 'pdf' || ext === 'pdf') && file.url) {
    return lazyView(<PdfView url={file.url} />);
  }

  if ((file.kind === 'image' || IMAGE_EXTS.has(ext)) && file.url) {
    return <img src={file.url} alt={file.name} className="mx-auto max-w-full rounded-card" />;
  }

  if ((file.kind === 'video' || VIDEO_EXTS.has(ext)) && file.url) {
    return (
      <video
        controls
        src={file.url}
        className="mx-auto max-h-full max-w-full rounded-card bg-black"
      >
        Your browser can't play this video.
      </video>
    );
  }

  if ((file.kind === 'audio' || AUDIO_EXTS.has(ext)) && file.url) {
    return (
      <div className="grid h-full place-items-center">
        <div className="flex w-full max-w-140 flex-col items-center gap-3">
          <p className="t-subtitle">{file.name}</p>
          <audio controls src={file.url} className="w-full" />
        </div>
      </div>
    );
  }

  if ((file.kind === 'sheet' || SHEET_EXTS.has(ext)) && file.url) {
    return lazyView(<SheetView url={file.url} />);
  }

  // docx renders in the browser; legacy binary .doc has no web viewer.
  if (ext === 'docx' && file.url) {
    return lazyView(<DocxView url={file.url} />);
  }

  // Markdown — render with PlateJS.
  if (file.kind === 'md' && file.content) {
    return <PlateMarkdown content={file.content} className="mx-auto max-w-175" />;
  }

  // Plain text (or extracted text content from other kinds).
  if ((file.kind === 'txt' || file.content) && file.content != null) {
    return (
      <article className="mx-auto max-w-175 p-6 text-[0.95rem] leading-relaxed whitespace-pre-wrap text-fg">
        {file.content}
      </article>
    );
  }

  return <UnsupportedPreview file={file} />;
}
