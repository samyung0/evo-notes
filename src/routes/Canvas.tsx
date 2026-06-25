import { Suspense, lazy } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Panel } from '@/components/app/layout';
import { Icon, Spinner, Text } from '@/components/ui';
import { useCanvas, useSaveCanvas } from '@/api/hooks';

const CanvasEditor = lazy(() => import('@/features/thinking/CanvasEditor'));

export default function Canvas() {
  const params = useParams({ strict: false });
  const canvasId = (params as { canvasId: string }).canvasId;
  const { data: canvas, isLoading } = useCanvas(canvasId);
  const save = useSaveCanvas(canvasId);

  return (
    <PanelWithInvertedRadius>
      <div className="flex items-center gap-3 border-b border-divider px-5 py-3">
        <Link to="/thinking" preload="intent" className="text-fg-muted hover:text-fg">
          <Icon name="chevronLeft" size={20} />
        </Link>
        <Text variant="subtitle" className="flex-1">
          {canvas?.name ?? 'Canvas'}
        </Text>
        {save.isPending && (
          <Text variant="meta" tone="muted">
            Saving…
          </Text>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {isLoading ? (
          <div className="grid h-full place-items-center">
            <Spinner />
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="grid h-full place-items-center">
                <Spinner />
              </div>
            }
          >
            <CanvasEditor
              initialScene={canvas?.scene}
              onChange={(scene) => save.mutate({ scene })}
            />
          </Suspense>
        )}
      </div>
    </PanelWithInvertedRadius>
  );
}
