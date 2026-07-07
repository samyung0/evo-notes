import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

const menuVariants = cva('w-auto min-w-36 p-0', {
  variants: {
    variant: {
      default: '',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const menuItemVariants = cva(
  'flex w-full items-center gap-1.5 rounded-row px-3 py-2 text-left font-semibold transition-colors disabled:opacity-40',
  {
    variants: {
      danger: {
        true: 'text-tint-error-fg hover:bg-tint-error',
        false: 'text-fg hover:bg-surface-hover-bg',
      },
    },
    defaultVariants: {
      danger: false,
    },
  }
);

export interface MenuItem {
  label: string;
  icon?: IconName;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface MenuProps extends VariantProps<typeof menuVariants> {
  items: MenuItem[];
  /** Custom trigger. Defaults to the unified thick vertical 3-dot button. */
  trigger?: ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
  iconContainerClassName?: string;
}

/** Unified action menu — Popover-backed, thick-stroke vertical three-dot used app-wide. */
export function Menu({
  items,
  trigger,
  align = 'end',
  variant = 'default',
  iconContainerClassName,
  className,
}: MenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <IconButton
            icon="moreVertical"
            variant="ghost-hover"
            size="sm"
            strokeWidth={3.5}
            label="Open menu"
            className={iconContainerClassName}
          />
        )}
      </PopoverTrigger>
      <PopoverContent
        data-slot="menu"
        data-variant={variant}
        align={align}
        className={cn(menuVariants({ variant }), className)}
      >
        <Card radius="card" border="solid" className="block p-1">
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
              className={menuItemVariants({ danger: it.danger })}
            >
              {it.icon && <Icon name={it.icon} className="size-5" />}
              <span className="translate-y-px">{it.label}</span>
            </button>
          ))}
        </Card>
      </PopoverContent>
    </Popover>
  );
}
