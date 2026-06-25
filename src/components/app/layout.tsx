import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Card, Text } from '@/components/ui';
import { TopInsetBar } from './TopInsetBar';

export function PanelWithInvertedRadius({
  children,
  className,
  sectionClassName,
}: {
  children: ReactNode;
  className?: string;
  sectionClassName?: string;
  scroll?: boolean;
}) {
  return (
    <Card
      theme="transparent"
      radius="card-xl"
      className={cn(
        'inverted-radius-large-panel-container h-full w-full p-0 shadow-card',
        className
      )}
    >
      <section className={cn('relative h-full max-w-full overflow-hidden', sectionClassName)}>
        <Card
          asChild
          theme="light"
          radius="card-xl"
          className={cn('inverted-radius-large-panel absolute inset-0 block p-0', className)}
        >
          <div></div>
        </Card>
        <div className="relative flex h-full flex-col items-stretch gap-2 overflow-auto p-0">
          {children}
        </div>
      </section>
    </Card>
  );
}
export function Panel({
  children,
  className,
  sectionClassName,
}: {
  children: ReactNode;
  className?: string;
  sectionClassName?: string;
  scroll?: boolean;
}) {
  return (
    <Card
      asChild
      theme="light"
      radius="card-xl"
      className={cn('h-full min-h-full overflow-hidden p-0 shadow-card', className)}
    >
      <div>
        <section
          className={cn(
            'flex max-h-full flex-col items-stretch gap-2 overflow-auto p-0',
            sectionClassName
          )}
        >
          {children}
        </section>
      </div>
    </Card>
  );
}

/**
 * General-page header: page title + actions on the left, the top-level inset
 * bar (search / notifications / profile) nested at the top-right.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  showTopBar = true,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  showTopBar?: boolean;
}) {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
      <div className="flex min-w-0 items-center gap-6 px-6 pt-6 pb-2">
        <div className="min-w-0">
          {typeof title === 'string' ? <Text variant="page-title">{title}</Text> : title}
          {subtitle && (
            <Text variant="body" tone="secondary" className="mt-1">
              {subtitle}
            </Text>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {showTopBar && <TopInsetBar />}
    </header>
  );
}

/** Fixed-width right column used by the dashboard and opened-workspace views. */
export function RightRail({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <aside
      className={cn('flex h-full min-h-full shrink-0 flex-col gap-2.5 overflow-hidden', className)}
    >
      {children}
    </aside>
  );
}

/** Sort/filter control cluster shared by Workspaces, Quizzes, Schedule. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-center gap-2', className)}>{children}</div>;
}
