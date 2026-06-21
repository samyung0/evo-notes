import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

type Variant = 'dark' | 'accent' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  dark: 'bg-action text-action-fg hover:bg-action-hover',
  accent: 'bg-accent text-accent-fg hover:bg-accent-hover',
  outline: 'bg-surface text-fg-soft border border-line hover:bg-inset',
  ghost: 'bg-transparent text-fg-soft hover:bg-inset',
};

const SIZE: Record<Size, { box: string; icon: number }> = {
  sm: { box: 'w-[38px] h-[38px] rounded-input', icon: 19 },
  md: { box: 'w-[46px] h-[46px] rounded-button', icon: 22 },
  lg: { box: 'w-[52px] h-[52px] rounded-button', icon: 24 },
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  variant?: Variant;
  size?: Size;
  dot?: boolean;
  strokeWidth?: number;
  label?: string;
}

export function IconButton({
  icon,
  variant = 'outline',
  size = 'md',
  dot,
  strokeWidth,
  label,
  className,
  ...rest
}: IconButtonProps) {
  const s = SIZE[size];
  return (
    <button
      aria-label={label ?? rest['aria-label']}
      className={cn(
        'relative inline-flex items-center justify-center transition-colors',
        VARIANT[variant],
        s.box,
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={s.icon} strokeWidth={strokeWidth} />
      {dot && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-solid-error ring-2 ring-surface" />
      )}
    </button>
  );
}
