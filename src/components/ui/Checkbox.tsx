import { cn } from '@/lib/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import { Icon } from './Icon';

const checkboxVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[7px] border transition-colors',
  {
    variants: {
      tone: {
        dark: '',
        blue: '',
        green: '',
        purple: '',
      },
      checked: {
        true: '',
        false: 'border-line-strong bg-surface',
      },
    },
    compoundVariants: [
      { tone: 'dark', checked: true, class: 'bg-action border-action text-action-fg' },
      { tone: 'blue', checked: true, class: 'bg-solid-info border-solid-info text-white' },
      { tone: 'green', checked: true, class: 'bg-solid-success border-solid-success text-white' },
      { tone: 'purple', checked: true, class: 'bg-accent border-accent text-accent-fg' },
    ],
    defaultVariants: {
      tone: 'dark',
      checked: false,
    },
  }
);

export interface CheckboxProps extends VariantProps<typeof checkboxVariants> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: number;
  className?: string;
}

export function Checkbox({
  checked = false,
  onChange,
  size = 20,
  tone = 'dark',
  className,
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-slot="checkbox"
      data-tone={tone}
      onClick={() => onChange?.(!checked)}
      className={cn(checkboxVariants({ tone, checked }), className)}
      style={{ width: size, height: size }}
    >
      {checked && <Icon name="check" size={size * 0.72} strokeWidth={2.4} />}
    </button>
  );
}
