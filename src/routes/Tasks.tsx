import { Panel, PageHeader, PanelWithInvertedRadius } from '@/components/app/layout';
import { Checkbox, SkeletonList, Text } from '@/components/ui';
import { useTasks, useToggleTask } from '@/api/hooks';
import { m } from '@/i18n';

export default function Tasks() {
  const { data, isLoading } = useTasks();
  const toggle = useToggleTask();

  const groups = (data ?? []).reduce<Record<string, typeof data>>((acc, t) => {
    const day = new Date(t.dueDate).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    (acc[day] ??= []).push(t);
    return acc;
  }, {});

  return (
    <PanelWithInvertedRadius>
      <PageHeader title={m.nav_tasks()} />
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        {isLoading ? (
          <div className="mx-auto max-w-2xl">
            <SkeletonList count={6} rowHeight={56} />
          </div>
        ) : !data?.length ? (
          <Text variant="body" tone="muted" className="py-8 text-center">
            {m.tasks_empty()}
          </Text>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            {Object.entries(groups).map(([day, list]) => (
              <section key={day}>
                <Text variant="label" tone="muted" className="mb-2 block">
                  {day}
                </Text>
                <div className="flex flex-col gap-1">
                  {list?.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggle.mutate({ id: t.id, done: !t.done })}
                      className="flex items-start gap-3 rounded-card border border-line bg-surface px-4 py-3 text-left hover:bg-surface-hover-bg"
                    >
                      <Checkbox checked={t.done} tone="purple" size={22} />
                      <span className="min-w-0">
                        <span
                          className={
                            t.done
                              ? 'block font-medium text-fg-muted line-through'
                              : 'block font-medium text-fg'
                          }
                        >
                          {t.title}
                        </span>
                        {t.meta && <span className="block text-xs text-fg-muted">{t.meta}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </PanelWithInvertedRadius>
  );
}
