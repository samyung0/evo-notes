import type { ElementType, HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { cva, VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

const cardVariants = cva('flex flex-col items-center gap-2 p-5.5', {
  variants: {
    radius: {
      card: 'rounded-card',
      'card-lg': 'rounded-card-lg',
      'card-xl': 'rounded-card-xl',
      panel: 'rounded-card-lg',
      row: 'rounded-row',
    },
    border: {
      none: '',
      solid: 'border border-line',
      dashed: 'border-[1.5px] border-dashed border-line-strong',
    },
    theme: {
      light: 'bg-surface text-surface-fg hover:bg-surface-hover-bg',
      gray: 'bg-surface-dark text-surface-dark-fg hover:bg-surface-dark-hover-bg',
    },
  },
  defaultVariants: {
    radius: 'card',
    border: 'none',
    theme: 'light',
  },
});

export interface CardProps extends React.ComponentProps<'div'>, VariantProps<typeof cardVariants> {
  interactive?: boolean;
  raised?: boolean;
  asChild?: boolean;
  hoverBackgroundColorChange?: boolean;
}

export function Card({
  radius = 'card',
  theme = 'light',
  border = 'none',
  hoverBackgroundColorChange = false,
  interactive,
  raised,
  className,
  style,
  asChild,
  ...rest
}: CardProps) {
  const Tag = (asChild ? Slot.Root : 'div') as ElementType;
  return (
    <Tag
      className={cn(
        'flex flex-col items-center gap-2 p-5.5',
        cardVariants({ radius, theme, border }),
        raised && 'shadow-card',
        interactive &&
          'cursor-pointer transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-card',
        (!hoverBackgroundColorChange || !interactive) && 'hover:bg-unset',
        className
      )}
      style={{ ...style }}
      {...rest}
    />
  );
}
