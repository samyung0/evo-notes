import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type NamedSize = 'xs' | 'sm' | 'md' | 'lg';
const SIZES: Record<NamedSize, number> = { xs: 24, sm: 30, md: 38, lg: 48 };

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  src?: string;
  name?: string;
  size?: NamedSize | number;
}

function initials(name?: string): string {
  if (!name) return '·';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({
  src,
  name,
  size = 'md',
  className,
  style,
  ...rest
}: AvatarProps) {
  const px = typeof size === 'number' ? size : SIZES[size];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill bg-tint-purple font-bold text-tint-purple-fg',
        className
      )}
      style={{ width: px, height: px, fontSize: px * 0.4, ...style }}
      {...rest}
    >
      {src ? (
        <img
          src={src}
          alt={name ?? ''}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
