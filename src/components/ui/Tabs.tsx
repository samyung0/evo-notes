import { cn } from '@/lib/cn';

type Tab = string | { value: string; label: string };

export interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange?: (value: string) => void;
  className?: string;
}

const norm = (t: Tab) => (typeof t === 'string' ? { value: t, label: t } : t);

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 border-b border-divider', className)}>
      {tabs.map((tab) => {
        const t = norm(tab);
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange?.(t.value)}
            className={cn(
              'border-b-2 px-3 py-2 text-[0.85rem] transition-colors -mb-px',
              active ? 'border-action font-bold text-fg' : 'border-transparent font-medium text-fg-muted hover:text-fg',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
