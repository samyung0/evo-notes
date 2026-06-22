import type { ElementType, HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Tailwind rounded-* token name. */
  radius?: 'card' | 'card-lg' | 'card-xl' | 'panel' | 'row';
  border?: 'none' | 'solid' | 'dashed';
  backgroundColor?: 'light' | 'gray';
  interactive?: boolean;
  raised?: boolean;
  as?: ElementType;
}

const RADIUS = {
  card: 'rounded-card',
  'card-lg': 'rounded-card-lg',
  'card-xl': 'rounded-card-xl',
  panel: 'rounded-card-lg',
  row: 'rounded-row',
} as const;

export function Card({
  radius = 'card',
  backgroundColor = 'light',
  border = 'none',
  interactive,
  raised,
  className,
  style,
  as,
  children,
  ...rest
}: CardProps) {
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag
      className={cn(
        'flex flex-col items-center gap-2 p-5.5',
        backgroundColor === 'light' && 'bg-surface text-surface-fg',
        backgroundColor === 'gray' && 'bg-surface-dark text-surface-dark-fg',
        RADIUS[radius],
        border === 'dashed' &&
          'border-[1.5px] border-dashed border-line-strong',
        border === 'solid' && 'border border-line',
        raised && 'shadow-card',
        interactive &&
          'cursor-pointer transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-card',
        className
      )}
      style={{ ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
