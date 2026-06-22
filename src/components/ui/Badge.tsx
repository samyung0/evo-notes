import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone =
  | 'neutral'
  | 'course'
  | 'workspace'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'purple'
  | 'green'
  | 'dark';

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-hover-bg text-fg-soft',
  course: 'bg-tint-info text-tint-info-fg',
  info: 'bg-tint-info text-tint-info-fg',
  workspace: 'bg-tint-warning text-tint-warning-fg',
  warning: 'bg-tint-warning text-tint-warning-fg',
  success: 'bg-tint-success text-tint-success-fg',
  green: 'bg-tint-green text-tint-green-fg',
  error: 'bg-tint-error text-tint-error-fg',
  purple: 'bg-tint-purple text-tint-purple-fg',
  dark: 'bg-action text-action-fg',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: 'sm' | 'md';
  uppercase?: boolean;
}

export function Badge({
  tone = 'neutral',
  size = 'md',
  uppercase,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill leading-none font-bold',
        size === 'sm'
          ? 'px-2 py-0.5 text-[10px]'
          : 'px-2.5 py-[3px] text-[11px]',
        uppercase && 'tracking-[0.06em] uppercase',
        TONE[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
