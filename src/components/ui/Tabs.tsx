import { cn } from '@/lib/cn';

type Tab = string | { value: string; label: string };

export interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  bottomBorder?: boolean;
}

const norm = (t: Tab) => (typeof t === 'string' ? { value: t, label: t } : t);

export function Tabs({ tabs, value, onChange, className, bottomBorder = true }: TabsProps) {
  return (
    <div className={cn('flex w-full gap-1', bottomBorder && 'border-b border-divider', className)}>
      {tabs.map((tab) => {
        const t = norm(tab);
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange?.(t.value)}
            className={cn(
              '-mb-px px-3 py-2 font-semibold transition-colors',
              bottomBorder && 'border-b-2',
              active
                ? 'border-action font-bold text-fg'
                : 'border-transparent text-fg-muted hover:text-fg'
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
