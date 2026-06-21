import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useOutsideClick } from '@/lib/useOutsideClick';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';

export interface MenuItem {
  label: string;
  icon?: IconName;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface MenuProps {
  items: MenuItem[];
  /** Custom trigger. Defaults to the unified thick vertical 3-dot button. */
  trigger?: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

/** Unified action menu — the thick-stroke vertical three-dot used app-wide. */
export function Menu({ items, trigger, align = 'end', className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      <span
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((o) => !o);
        }}
      >
        {trigger ?? (
          <IconButton icon="moreVertical" variant="ghost" size="sm" strokeWidth={2.6} label="Open menu" />
        )}
      </span>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-full z-30 mt-1 min-w-[180px] overflow-hidden rounded-card border border-line bg-surface py-1 shadow-pop',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((it, i) => (
            <button
              key={i}
              role="menuitem"
              disabled={it.disabled}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                it.onClick?.();
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors disabled:opacity-40',
                it.danger ? 'text-tint-error-fg hover:bg-tint-error' : 'text-fg hover:bg-inset',
              )}
            >
              {it.icon && <Icon name={it.icon} size={16} />}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
