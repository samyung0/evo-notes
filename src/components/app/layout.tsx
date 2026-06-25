import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Card, Text } from '@/components/ui';
import { TopInsetBar } from './TopInsetBar';

/** White inset "page" surface — the central card on general pages. */
export function Panel({
  children,
  className,
  scroll = true,
}: {
  children: ReactNode;
  className?: string;
  scroll?: boolean;
}) {
  return (
    <Card
      asChild
      theme="light"
      radius="card-xl"
      className={cn(
        'flex h-full min-h-full flex-col items-stretch p-0 shadow-card',
        scroll && 'overflow-auto',
        className
      )}
    >
      <section>{children}</section>
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
    <header className="flex flex-col gap-3 px-6 pt-6 pb-2 md:flex-row md:items-start md:justify-between md:gap-6">
      <div className="flex min-w-0 items-center gap-3">
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
