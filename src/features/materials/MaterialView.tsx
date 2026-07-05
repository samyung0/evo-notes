import { Skeleton, Text } from '@/components/ui';
import { useMaterial } from '@/api/hooks';
import { PlateMarkdown } from './PlateMarkdown';

/** Renders a persisted mindmap/diagram material (markdown + mermaid) in-pane. */
export function MaterialView({ materialId }: { materialId: string }) {
  const { data: material, isLoading } = useMaterial(materialId);

  if (isLoading || !material) return <Skeleton className="h-full min-h-[40vh] w-full" />;

  return (
    <article className="mx-auto max-w-[760px]">
      <PlateMarkdown content={material.content} />
      {(material.scopeChapters.length > 0 || material.scopeFileIds.length > 0) && (
        <Text variant="meta" tone="muted" className="mt-6 border-t border-divider pt-3">
          Scope: {material.scopeChapters.join(', ') || `${material.scopeFileIds.length} file(s)`}
        </Text>
      )}
    </article>
  );
}
