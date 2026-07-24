import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { cva, VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

const iconButtonVariants = cva(
  'relative inline-flex cursor-pointer items-center justify-center p-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-action disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        dark: 'bg-action text-action-fg outline-offset-2 hover:bg-action-hover focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-action',
        accent: 'bg-action-accent text-action-accent-fg hover:bg-action-accent-hover',
        'accent-light': 'bg-tint-accent-1 text-tint-accent-1-fg hover:bg-solid-accent-1/30',
        neutral: 'bg-surface text-surface-fg hover:bg-surface-hover-bg',
        gray: 'bg-page text-fg hover:bg-surface-dark',
        'dark-gray': 'bg-surface-dark text-fg hover:bg-surface-dark-hover-bg',
        ghost: 'bg-surface text-fg',
        outline: 'border border-line bg-surface text-fg hover:bg-surface-hover-bg',
        'ghost-hover': 'bg-surface text-fg hover:bg-surface-hover-bg',
      },
      size: {
        xs: 'rounded-row [&>svg]:size-[14px]',
        sm: 'rounded-row [&>svg]:size-[17px]',
        md: 'rounded-button [&>svg]:size-5',
        lg: 'rounded-button [&>svg]:size-6',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'md',
    },
  }
);

// const SIZE = {
//   sm: 19,
//   md: 22,
//   lg: 24,
// };

export interface IconButtonProps
  extends React.ComponentProps<'button'>, VariantProps<typeof iconButtonVariants> {
  icon: IconName;
  dot?: boolean;
  strokeWidth?: number;
  label?: string;
  asChild?: boolean;
  iconClassName?: string;
}

export function IconButton({
  icon,
  variant,
  size,
  dot,
  strokeWidth,
  label,
  children,
  className,
  iconClassName,
  ...rest
}: IconButtonProps) {
  const Tag = rest.asChild ? Slot.Root : 'button';
  return (
    <Tag
      data-slot="iconbutton"
      data-variant={variant}
      data-size={size}
      aria-label={label ?? rest['aria-label']}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...rest}
    >
      <Icon name={icon} strokeWidth={strokeWidth} className={iconClassName} />
      {children}
      {dot && (
        <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-solid-error ring-1 ring-surface" />
      )}
    </Tag>
  );
}
