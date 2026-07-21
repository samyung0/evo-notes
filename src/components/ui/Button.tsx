import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

const buttonVariants = cva(
  'inline-flex min-w-0 cursor-pointer items-center justify-center leading-none font-semibold whitespace-nowrap transition-all duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-action active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'border border-transparent bg-action text-action-fg outline-offset-2 hover:brightness-95 focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-action',
        accent:
          'border border-transparent bg-action-accent text-action-accent-fg hover:bg-action-accent-hover',
        outline: 'border border-line bg-surface text-fg hover:bg-surface-hover-bg',
        surface: 'border border-transparent bg-surface text-fg hover:bg-surface-hover-bg',
        ghost: 'border-none text-fg',
        'ghost-hover': 'border-none text-fg hover:bg-surface-hover-bg',
        'ghost-link': 'border-none text-link hover:text-link-hover',
        gray: 'bg-page text-surface-dark-fg hover:bg-surface-dark',
        danger: 'border border-transparent bg-solid-error text-surface hover:brightness-95',
      },
      size: {
        sm: 'gap-[7px] rounded-button px-4 py-2 text-[0.8125rem]',
        md: 'gap-2 rounded-button px-5 py-3 text-sm',
        lg: 'gap-[9px] rounded-card px-6.5 py-5 text-[0.9375rem]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  iconLeft?: IconName;
  iconRight?: IconName;
  fullWidth?: boolean;
}

const InlineIcon = ({
  name,
  size,
}: {
  name: IconName;
  size: VariantProps<typeof buttonVariants>['size'];
}) => (
  <Icon
    name={name}
    className={cn(
      'pointer-events-none shrink-0 -translate-y-px',
      size === 'sm' && 'size-3.75',
      size === 'md' && 'size-4',
      size === 'lg' && 'size-4.5'
    )}
  />
);

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth,
  className,
  asChild = false,
  ...rest
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot.Root
        data-slot="button"
        data-variant={variant}
        data-size={size}
        children={children}
        className={cn(cn(buttonVariants({ variant, size })), fullWidth && 'w-full', className)}
        {...rest}
      />
    );
  }
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), fullWidth && 'w-full', className)}
      {...rest}
    >
      {iconLeft && <InlineIcon name={iconLeft} size={size} />}
      {children}
      {iconRight && <InlineIcon name={iconRight} size={size} />}
    </button>
  );
}
