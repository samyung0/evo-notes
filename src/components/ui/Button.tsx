import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-action text-action-fg hover:bg-action-hover border border-transparent',
  accent: 'bg-accent text-accent-fg hover:bg-accent-hover border border-transparent',
  outline: 'bg-surface text-fg border border-line hover:bg-inset',
  ghost: 'bg-transparent text-fg-soft border border-transparent hover:bg-inset',
};

const SIZE: Record<Size, string> = {
  sm: 'text-[0.8125rem] px-4 py-[9px] gap-[7px] rounded-button',
  md: 'text-sm px-5 py-3 gap-2 rounded-button',
  lg: 'text-[0.9375rem] px-[26px] py-[15px] gap-[9px] rounded-card',
};

const ICON_SIZE: Record<Size, number> = { sm: 15, md: 16, lg: 18 };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
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
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center font-semibold leading-none whitespace-nowrap',
        'transition-[filter,background-color,transform] duration-150 active:scale-[0.98]',
        VARIANT[variant],
        SIZE[size],
        fullWidth && 'w-full',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {iconLeft && <Icon name={iconLeft} size={ICON_SIZE[size]} />}
      {children}
      {iconRight && <Icon name={iconRight} size={ICON_SIZE[size]} />}
    </button>
  );
}
