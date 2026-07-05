import { useState } from 'react';
import { Panel, PageHeader, PanelWithInvertedRadius } from '@/components/app/layout';
import { Badge, Card, Icon, SimpleDialog, SkeletonCardGrid, Text } from '@/components/ui';
import { useAllFiles } from '@/api/hooks';
import { FileViewer } from '@/features/files/FileViewer';
import type { SourceFile } from '@/api/types';
import { m } from '@/i18n';

export default function Files() {
  const { data, isLoading } = useAllFiles();
  const [open, setOpen] = useState<SourceFile | null>(null);

  return (
    <PanelWithInvertedRadius>
      <PageHeader title={m.nav_files()} />
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        {isLoading ? (
          <SkeletonCardGrid count={6} cardHeight={72} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data?.map((f) => (
              <Card
                key={f.id}
                interactive
                radius="card-lg"
                onClick={() => setOpen(f)}
                className="flex items-center gap-3 p-5.5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-card bg-surface-hover-bg text-fg-secondary">
                  <Icon name="files" size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <Text variant="subtitle" className="truncate">
                    {f.name}
                  </Text>
                  <Text variant="meta" tone="muted">
                    {(f.sizeKb / 1024).toFixed(1)} MB
                  </Text>
                </div>
                <Badge tone="neutral" size="sm">
                  {f.kind}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
      <SimpleDialog open={!!open} onClose={() => setOpen(null)} title={open?.name} width={760}>
        <div className="min-h-[50vh]">{open && <FileViewer file={open} />}</div>
      </SimpleDialog>
    </PanelWithInvertedRadius>
  );
}
