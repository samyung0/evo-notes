import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: number;
  /** Tailwind rounded-* token name. */
  radius?: 'card' | 'card-lg' | 'panel' | 'row';
  interactive?: boolean;
  raised?: boolean;
  dashed?: boolean;
}

const RADIUS = {
  card: 'rounded-card',
  'card-lg': 'rounded-card-lg',
  panel: 'rounded-panel',
  row: 'rounded-row',
} as const;

export function Card({
  padding = 22,
  radius = 'card',
  interactive,
  raised,
  dashed,
  className,
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        RADIUS[radius],
        dashed
          ? 'border-[1.5px] border-dashed border-line-strong bg-transparent'
          : 'border border-line bg-surface',
        raised && 'shadow-card',
        interactive &&
          'cursor-pointer transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-card',
        className,
      )}
      style={{ padding, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
