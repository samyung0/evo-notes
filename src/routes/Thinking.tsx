import { Link } from '@tanstack/react-router';
import { Panel, PageHeader } from '@/components/app/layout';
import { Card, Icon, IconButton, Spinner, Text } from '@/components/ui';
import { useCanvases, useCreateCanvas } from '@/api/hooks';
import { m } from '@/i18n';

export default function Thinking() {
  const { data, isLoading } = useCanvases();
  const create = useCreateCanvas();

  return (
    <PanelWithInvertedRadius>
      <PageHeader
        title={m.nav_thinking()}
        actions={
          <IconButton
            icon="plus"
            variant="dark"
            label="New canvas"
            onClick={() => {
              const n = prompt('Canvas name');
              if (n) create.mutate(n);
            }}
          />
        }
      />
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        {isLoading ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.map((c, i) => (
              <Link
                key={c.id}
                to="/thinking/$canvasId"
                params={{ canvasId: c.id }}
                preload="intent"
              >
                <Card interactive padding={0} radius="card-lg" className="overflow-hidden">
                  <div
                    className="flex h-28 items-center justify-center"
                    style={{
                      background: i % 2 ? 'var(--note-purple-bg)' : 'var(--note-green-bg)',
                      color: i % 2 ? 'var(--note-purple-fg)' : 'var(--note-green-fg)',
                    }}
                  >
                    <Icon name="notes" size={28} />
                  </div>
                  <div className="p-4">
                    <Text variant="subtitle" className="truncate">
                      {c.name}
                    </Text>
                    <Text variant="meta" tone="muted" className="mt-0.5">
                      Updated {new Date(c.updatedAt).toLocaleDateString()}
                    </Text>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PanelWithInvertedRadius>
  );
}
