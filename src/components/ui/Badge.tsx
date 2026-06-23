import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { cva, VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-pill leading-none font-bold', {
  variants: {
    size: {
      sm: 'px-2 py-0.5 text-xs',
      md: 'py-0.875 px-2.5 text-xs',
    },
    tone: {
      neutral: 'bg-surface-hover-bg text-surface-fg',
      dark: 'bg-action text-action-fg',
      info: 'bg-tint-info text-tint-info-fg',
      warning: 'bg-tint-warning text-tint-warning-fg',
      success: 'bg-tint-success text-tint-success-fg',
      'accent-2': 'bg-tint-accent-2 text-tint-accent-2-fg',
      error: 'bg-tint-error text-tint-error-fg',
      'accent-1': 'bg-tint-accent-1 text-tint-accent-1-fg',
    },
  },
});

export interface BadgeProps
  extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  uppercase?: boolean;
  asChild?: boolean;
}

export function Badge({
  tone = 'neutral',
  size = 'md',
  uppercase,
  className,
  asChild,
  ...rest
}: BadgeProps) {
  const Tag = (asChild ? Slot.Root : 'span') as React.ElementType;
  return (
    <Tag
      className={cn(
        badgeVariants({ tone, size }),
        uppercase && 'tracking-[0.06em] uppercase',
        className
      )}
      {...rest}
    />
  );
}
