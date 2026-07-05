import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Skeleton } from '@/components/ui';

// Load the worker from a CDN matching the bundled pdfjs version.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

const PAGE_WIDTH = 680;
// Fallback slot height (A4 portrait aspect) until a page renders.
const DEFAULT_PAGE_HEIGHT = Math.round(PAGE_WIDTH * 1.414);

export default function PdfView({ url }: { url: string }) {
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    setNumPages(0);
  }, [url]);

  return (
    <div className="relative flex h-full flex-col items-center">
      <Document
        file={url}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        loading={<Skeleton className="h-[680px] w-[680px] max-w-full" />}
        error={<p className="t-body py-8 text-tint-error-fg">Couldn't load this PDF.</p>}
      >
        <div className="flex flex-col items-center gap-4">
          {Array.from({ length: numPages }, (_, i) => {
            const p = i + 1;
            return (
              <div key={p} data-page={p} style={{ width: PAGE_WIDTH }} className="max-w-full">
                <Page
                  pageNumber={p}
                  width={PAGE_WIDTH}
                  renderTextLayer
                  renderAnnotationLayer={false}
                  loading={<Skeleton style={{ height: DEFAULT_PAGE_HEIGHT }} className="w-full" />}
                />
              </div>
            );
          })}
        </div>
      </Document>
    </div>
  );
}
