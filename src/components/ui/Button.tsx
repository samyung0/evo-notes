import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center leading-none font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'border border-transparent bg-action text-action-fg hover:bg-action-hover',
        accent: 'border border-transparent bg-accent text-accent-fg hover:bg-accent-hover',
        outline: 'border border-line bg-surface text-fg hover:bg-surface-hover-bg',
        surface: 'border border-transparent bg-surface text-fg hover:bg-surface-hover-bg',
        ghost: 'border-none text-fg',
        'ghost-link': 'border-none text-link hover:text-link-hover',
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

const ICON_SIZE: Record<string, number> = { sm: 15, md: 16, lg: 18 };

export interface ButtonProps
  extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  iconLeft?: IconName;
  iconRight?: IconName;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth,
  className,
  disabled,
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
        className={cn(
          cn(buttonVariants({ variant, size })),
          fullWidth && 'w-full',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        {...rest}
      />
    );
  }
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      className={cn(
        cn(buttonVariants({ variant, size })),
        fullWidth && 'w-full',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      {...rest}
    >
      {iconLeft && <Icon name={iconLeft} size={ICON_SIZE[size ?? 'md']} />}
      {children}
      {iconRight && <Icon name={iconRight} size={ICON_SIZE[size ?? 'md']} />}
    </button>
  );
}
