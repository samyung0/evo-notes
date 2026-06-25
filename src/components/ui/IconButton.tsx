import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { cva, VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

const iconButtonVariants = cva(
  'relative inline-flex cursor-pointer items-center justify-center transition-colors',
  {
    variants: {
      variant: {
        dark: 'bg-action text-action-fg hover:bg-action-hover',
        accent: 'bg-accent text-accent-fg hover:bg-accent-hover',
        neutral: 'bg-surface text-surface-fg hover:bg-surface-hover-bg',
        ghost: 'bg-transparent text-fg',
        outline: 'border border-line bg-transparent text-fg hover:bg-surface-hover-bg',
      },
      size: {
        sm: '[&>svg]:size-4.8 size-9 rounded-input',
        md: 'size-10 rounded-button [&>svg]:size-5.5',
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
      <Icon name={icon} strokeWidth={strokeWidth} />
      {children}
      {dot && (
        <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-solid-error ring-1 ring-surface" />
      )}
    </Tag>
  );
}
