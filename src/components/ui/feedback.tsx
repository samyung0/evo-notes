import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn('size-4.5 animate-spin', className)}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn('animate-pulse rounded-row bg-surface-hover-bg', className)} style={style} />
  );
}

export function SkeletonCardGrid({
  count = 6,
  className,
  cardClassName,
  cardHeight = 150,
}: {
  count?: number;
  className?: string;
  cardClassName?: string;
  cardHeight?: number;
}) {
  return (
    <div
      className={cn('grid w-full grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4', className)}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('rounded-card-lg', cardClassName)}
          style={{ height: cardHeight }}
        />
      ))}
    </div>
  );
}

export function SkeletonList({
  count = 5,
  className,
  rowClassName,
  rowHeight = 44,
}: {
  count?: number;
  className?: string;
  rowClassName?: string;
  rowHeight?: number;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('rounded-row', rowClassName)}
          style={{ height: rowHeight }}
        />
      ))}
    </div>
  );
}

export function EmptyState({
  icon = 'sparkles',
  title,
  body,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-card bg-tint-accent-1 text-tint-accent-1-fg">
        <Icon name={icon} size={22} />
      </span>
      <Text variant="card-title">{title}</Text>
      {body && (
        <Text variant="body" tone="secondary" className="max-w-sm">
          {body}
        </Text>
      )}
      {action}
    </div>
  );
}
