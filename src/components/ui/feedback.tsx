import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-line border-t-fg',
        className
      )}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
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
      <span className="bg-tint-accent-1 text-tint-accent-1-fg flex h-12 w-12 items-center justify-center rounded-card">
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
