import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { IconButton, Spinner, Text } from '@/components/ui';

// Load the worker from a CDN matching the bundled pdfjs version.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export default function PdfView({ url }: { url: string }) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);

  return (
    <div className="flex h-full flex-col items-center">
      <Document
        file={url}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        loading={
          <div className="grid h-40 place-items-center">
            <Spinner />
          </div>
        }
        error={
          <Text variant="body" tone="muted" className="py-8">
            Couldn't load this PDF.
          </Text>
        }
      >
        <Page
          pageNumber={page}
          width={680}
          renderTextLayer
          renderAnnotationLayer={false}
        />
      </Document>
      {numPages > 1 && (
        <div className="sticky bottom-2 mt-3 flex items-center gap-3 rounded-pill border border-line bg-surface px-2 py-1 shadow-card">
          <IconButton
            icon="chevronLeft"
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            label="Previous page"
          />
          <Text variant="meta" tone="secondary" className="tabular-nums">
            {page} / {numPages}
          </Text>
          <IconButton
            icon="chevronRight"
            variant="ghost"
            size="sm"
            disabled={page >= numPages}
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            label="Next page"
          />
        </div>
      )}
    </div>
  );
}
