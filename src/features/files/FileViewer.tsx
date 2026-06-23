import { lazy, Suspense } from 'react';
import { Icon, Spinner, Text } from '@/components/ui';
import type { SourceFile } from '@/api/types';

const PdfView = lazy(() => import('./PdfView'));

export function FileViewer({ file }: { file: SourceFile | null }) {
  if (!file) {
    return (
      <div className="grid h-full place-items-center text-fg-muted">
        <div className="flex flex-col items-center gap-2">
          <Icon name="files" size={32} />
          <Text variant="body" tone="muted">
            Select a file to read it here.
          </Text>
        </div>
      </div>
    );
  }

  if (file.kind === 'pdf' && file.url) {
    return (
      <Suspense
        fallback={
          <div className="grid h-full place-items-center">
            <Spinner />
          </div>
        }
      >
        <PdfView url={file.url} />
      </Suspense>
    );
  }

  if (file.kind === 'image' && file.url) {
    return <img src={file.url} alt={file.name} className="mx-auto max-w-full rounded-card" />;
  }

  // md / txt / fallback — render the text content
  return (
    <article className="mx-auto max-w-[700px] text-[0.95rem] leading-relaxed whitespace-pre-wrap text-fg">
      {file.content ?? 'No preview available for this file type yet.'}
    </article>
  );
}
