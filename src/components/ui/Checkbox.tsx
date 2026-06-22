import { cn } from '@/lib/cn';
import { Icon } from './Icon';

type Tone = 'dark' | 'blue' | 'green' | 'purple';
const TONE: Record<Tone, string> = {
  dark: 'bg-action border-action text-action-fg',
  blue: 'bg-solid-info border-solid-info text-white',
  green: 'bg-solid-success border-solid-success text-white',
  purple: 'bg-accent border-accent text-accent-fg',
};

export interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: number;
  tone?: Tone;
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
      onClick={() => onChange?.(!checked)}
      className={cn(
        'inline-flex items-center justify-center rounded-[7px] border transition-colors',
        checked ? TONE[tone] : 'border-line-strong bg-surface',
        className
      )}
      style={{ width: size, height: size }}
    >
      {checked && <Icon name="check" size={size * 0.72} strokeWidth={2.4} />}
    </button>
  );
}
