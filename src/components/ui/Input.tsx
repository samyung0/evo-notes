import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { cva, VariantProps } from 'class-variance-authority';

const inputVariants = cva('t-body flex items-center gap-2 rounded-input', {
  variants: {
    variant: {
      light: 'border border-line bg-surface text-fg focus-within:border-line-strong',
      transparent: '',
    },
  },
  defaultVariants: {
    variant: 'light',
  },
});

export interface InputProps
  extends Omit<React.ComponentProps<'input'>, 'size'>, VariantProps<typeof inputVariants> {
  icon?: IconName;
  size?: 'sm' | 'md';
  wrapperClassName?: string;
}

export function Input({
  icon,
  size = 'md',
  wrapperClassName,
  className,
  variant,
  ...rest
}: InputProps) {
  return (
    <div
      className={cn(
        inputVariants({ variant }),
        size === 'sm' ? 'px-2.75 py-2' : 'px-3.25 py-2.5',
        wrapperClassName
      )}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} className="text-fg-muted" />}
      <input
        className={cn(
          'min-w-0 flex-1 border-none bg-transparent outline-none placeholder:text-placeholder',
          className
        )}
        {...rest}
      />
    </div>
  );
}
