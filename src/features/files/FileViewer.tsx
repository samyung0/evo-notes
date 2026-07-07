import { lazy, Suspense } from 'react';
import { Icon, Skeleton, Text } from '@/components/ui';
import type { SourceFile } from '@/api/types';
import { PlateMarkdown } from '@/features/materials/PlateMarkdown';

const PdfView = lazy(() => import('./PdfView'));

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

  if (file.kind === 'pdf' && file.url) {
    return (
      <Suspense fallback={<Skeleton className="h-full min-h-[50vh] w-full" />}>
        <PdfView url={file.url} />
      </Suspense>
    );
  }

  if (file.kind === 'image' && file.url) {
    return <img src={file.url} alt={file.name} className="mx-auto max-w-full rounded-card" />;
  }

  // Markdown — render with PlateJS.
  if (file.kind === 'md' && file.content) {
    return <PlateMarkdown content={file.content} className="mx-auto max-w-[700px]" />;
  }

  // txt / fallback — render the text content as-is.
  return (
    <article className="mx-auto max-w-[700px] text-[0.95rem] leading-relaxed whitespace-pre-wrap text-fg">
      {file.content ?? 'No preview available for this file type yet.'}
    </article>
  );
}
