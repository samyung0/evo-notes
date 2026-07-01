import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { IconButton, Skeleton, Text } from '@/components/ui';

// Load the worker from a CDN matching the bundled pdfjs version.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

const PAGE_WIDTH = 680;
// Fallback slot height (A4 portrait aspect) until a page reports its real size.
const DEFAULT_PAGE_HEIGHT = Math.round(PAGE_WIDTH * 1.414);
// Keep pages rendered while within this many px of the viewport; unmount the rest.
const OVERSCAN_PX = 2500;

export default function PdfView({ url }: { url: string }) {
  const [numPages, setNumPages] = useState(0);
  const [activePage, setActivePage] = useState(1);
  const [visible, setVisible] = useState<Set<number>>(() => new Set([1]));
  // Bump to re-render when a measured page height lands in the refs.
  const [, bumpHeights] = useReducer((n: number) => n + 1, 0);

  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const heights = useRef<number[]>([]);
  const ratios = useRef<number[]>([]);
  const activeRef = useRef(1);
  const observer = useRef<IntersectionObserver | null>(null);
  // Best guess for pages not yet measured; seeded by the first measured page
  // so placeholder heights match real pages and scrollHeight stays stable.
  const estHeight = useRef(DEFAULT_PAGE_HEIGHT);

  // Reset all per-document state whenever the file changes.
  useEffect(() => {
    setNumPages(0);
    setActivePage(1);
    activeRef.current = 1;
    setVisible(new Set([1]));
    slotRefs.current = [];
    heights.current = [];
    ratios.current = [];
    estHeight.current = DEFAULT_PAGE_HEIGHT;
  }, [url]);

  useEffect(() => {
    if (!numPages) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const p = Number((entry.target as HTMLElement).dataset.page);
          ratios.current[p] = entry.isIntersecting ? entry.intersectionRatio : 0;
        }
        const next = new Set<number>();
        let bestRatio = -1;
        let bestPage = activeRef.current;
        for (let p = 1; p <= numPages; p++) {
          const r = ratios.current[p] ?? 0;
          if (r > 0) next.add(p);
          if (r > bestRatio) {
            bestRatio = r;
            bestPage = p;
          }
        }
        setVisible(next);
        if (bestRatio > 0 && bestPage !== activeRef.current) {
          activeRef.current = bestPage;
          setActivePage(bestPage);
        }
      },
      { root: null, rootMargin: `${OVERSCAN_PX}px 0px`, threshold: [0, 0.1, 0.5, 1] }
    );
    observer.current = io;
    slotRefs.current.forEach((el) => el && io.observe(el));
    return () => {
      io.disconnect();
      observer.current = null;
    };
  }, [numPages]);

  const registerSlot = useCallback(
    (p: number) => (el: HTMLDivElement | null) => {
      const prev = slotRefs.current[p];
      if (prev && prev !== el) observer.current?.unobserve(prev);
      slotRefs.current[p] = el;
      if (el) observer.current?.observe(el);
    },
    []
  );

  const handlePageLoad = useCallback(
    (
      p: number,
      pageProxy: { getViewport: (o: { scale: number }) => { width: number; height: number } }
    ) => {
      const vp = pageProxy.getViewport({ scale: 1 });
      const h = Math.round((PAGE_WIDTH / vp.width) * vp.height);
      if (heights.current[p] !== h) {
        heights.current[p] = h;
        estHeight.current = h;
        bumpHeights();
      }
    },
    []
  );

  const goTo = useCallback((p: number) => {
    slotRefs.current[p]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

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
            const h = heights.current[p] || estHeight.current;
            const show = visible.has(p);
            return (
              <div
                key={p}
                data-page={p}
                ref={registerSlot(p)}
                style={{ width: PAGE_WIDTH, minHeight: show ? undefined : h }}
                className="max-w-full"
              >
                {show ? (
                  <Page
                    pageNumber={p}
                    width={PAGE_WIDTH}
                    renderTextLayer
                    renderAnnotationLayer={false}
                    onLoadSuccess={(pg) => handlePageLoad(p, pg)}
                    loading={<Skeleton style={{ height: h }} className="w-full" />}
                  />
                ) : (
                  <Skeleton style={{ height: h }} className="w-full" />
                )}
              </div>
            );
          })}
        </div>
      </Document>
      {/* {numPages > 1 && (
        <div className="sticky bottom-2 mt-3 flex items-center gap-3 rounded-pill border border-line bg-surface px-2 py-1 shadow-card">
          <IconButton
            icon="chevronLeft"
            variant="ghost"
            size="sm"
            disabled={activePage <= 1}
            onClick={() => goTo(activePage - 1)}
            label="Previous page"
          />
          <Text variant="meta" tone="secondary" className="tabular-nums">
            {activePage} / {numPages}
          </Text>
          <IconButton
            icon="chevronRight"
            variant="ghost"
            size="sm"
            disabled={activePage >= numPages}
            onClick={() => goTo(activePage + 1)}
            label="Next page"
          />
        </div>
      )} */}
    </div>
  );
}
