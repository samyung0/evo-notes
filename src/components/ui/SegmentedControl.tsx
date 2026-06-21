import { cn } from '@/lib/cn';

type Option = string | { value: string; label: string };

export interface SegmentedControlProps {
  options: Option[];
  value: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

const norm = (o: Option) => (typeof o === 'string' ? { value: o, label: o } : o);

export function SegmentedControl({ options, value, onChange, size = 'md', className }: SegmentedControlProps) {
  return (
    <div className={cn('inline-flex rounded-pill border border-line bg-surface p-[3px]', className)}>
      {options.map((opt) => {
        const o = norm(opt);
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange?.(o.value)}
            className={cn(
              'rounded-pill font-semibold transition-colors',
              size === 'sm' ? 'px-[15px] py-2 text-[12.5px]' : 'px-[19px] py-[11px] text-sm',
              active ? 'bg-action text-action-fg shadow-chip' : 'bg-transparent text-fg-muted hover:text-fg',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
