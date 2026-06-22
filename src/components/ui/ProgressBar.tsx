import { cn } from '@/lib/cn';

type Tone = 'green' | 'purple' | 'blue' | 'amber' | 'coral' | 'dark';

const FILL: Record<Tone, string> = {
  green: 'bg-solid-success',
  purple: 'bg-solid-purple',
  blue: 'bg-solid-info',
  amber: 'bg-solid-warning',
  coral: 'bg-solid-error',
  dark: 'bg-action',
};

export interface ProgressBarProps {
  value?: number;
  tone?: Tone;
  height?: number;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value = 0,
  tone = 'green',
  height = 6,
  showLabel,
  className,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="flex-1 overflow-hidden rounded-pill bg-surface-hover-bg"
        style={{ height }}
      >
        <div
          className={cn(
            'h-full rounded-pill transition-[width] duration-[400ms] ease-[cubic-bezier(.2,.7,.2,1)]',
            FILL[tone]
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="t-label text-fg-muted tabular-nums">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}
