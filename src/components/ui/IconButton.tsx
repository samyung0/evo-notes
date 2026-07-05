import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { cva, VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

const iconButtonVariants = cva(
  'relative inline-flex cursor-pointer items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-action',
  {
    variants: {
      variant: {
        dark: 'bg-action text-action-fg outline-offset-2 hover:bg-action-hover focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-action',
        accent: 'bg-accent text-accent-fg hover:bg-accent-hover',
        neutral: 'bg-surface text-surface-fg hover:bg-surface-hover-bg',
        gray: 'bg-page text-surface-dark-fg hover:bg-surface-dark',
        ghost: 'bg-transparent text-fg',
        outline: 'border border-line bg-transparent text-fg hover:bg-surface-hover-bg',
        'ghost-hover': 'bg-transparent text-fg hover:bg-surface-hover-bg',
      },
      size: {
        xs: 'size-7 rounded-row [&>svg]:size-[14px]',
        sm: 'size-9 rounded-row [&>svg]:size-[18px]',
        md: '[&>svg]:size-5. size-10 rounded-button',
        lg: 'size-11 rounded-button [&>svg]:size-6',
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
