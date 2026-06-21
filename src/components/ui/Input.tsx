import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: IconName;
  size?: 'sm' | 'md';
  wrapperClassName?: string;
}

export function Input({ icon, size = 'md', wrapperClassName, className, ...rest }: InputProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-input border border-line bg-surface text-fg',
        'focus-within:border-line-strong',
        size === 'sm' ? 'px-[11px] py-2' : 'px-[13px] py-2.5',
        wrapperClassName,
      )}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} className="text-fg-muted" />}
      <input
        className={cn(
          'min-w-0 flex-1 border-none bg-transparent text-sm text-fg outline-none placeholder:text-placeholder',
          className,
        )}
        {...rest}
      />
    </div>
  );
}
