import { cn } from '@/lib/cn';
import { cva, type VariantProps } from 'class-variance-authority';

type Option = string | { value: string; label: string };

const segmentedVariants = cva('inline-flex p-[3px]', {
  variants: {
    variant: {
      solid: 'rounded-pill border border-line bg-surface',
      ghost: 'rounded-row',
    },
  },
  defaultVariants: {
    variant: 'solid',
  },
});

const segmentVariants = cva('font-semibold transition-colors', {
  variants: {
    variant: {
      solid: 'rounded-pill',
      ghost: 'rounded-row',
    },
    size: {
      sm: 'px-[15px] py-2 text-[12.5px]',
      md: 'px-[19px] py-[11px] text-sm',
    },
    active: {
      true: 'bg-action text-action-fg shadow-chip',
      false: 'bg-transparent text-fg-muted hover:text-fg',
    },
  },
  defaultVariants: {
    variant: 'solid',
    size: 'md',
    active: false,
  },
});

export interface SegmentedControlProps extends VariantProps<typeof segmentedVariants> {
  options: Option[];
  value: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

const norm = (o: Option) => (typeof o === 'string' ? { value: o, label: o } : o);

export function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  variant = 'solid',
  className,
}: SegmentedControlProps) {
  return (
    <div className={cn(segmentedVariants({ variant }), className)}>
      {options.map((opt) => {
        const o = norm(opt);
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange?.(o.value)}
            className={segmentVariants({ variant, size, active })}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
