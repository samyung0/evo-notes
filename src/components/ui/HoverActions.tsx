import { cn } from '@/lib/cn';
import { Menu, type MenuItem } from './Menu';

export interface HoverActionsProps {
  items: MenuItem[];
  align?: 'start' | 'center' | 'end';
  /** Extra classes for the reveal wrapper. */
  className?: string;
}

/**
 * Action menu that stays hidden until the nearest `group` ancestor is hovered
 * (or something inside receives focus). Lifted from the dashboard task row so
 * the reveal behaviour is shared.
 */
export function HoverActions({ items, align = 'end', className }: HoverActionsProps) {
  return (
    <div
      className={cn(
        'opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100',
        // keep the trigger visible while its popover/menu is open
        'has-data-[state=open]:opacity-100',
        className
      )}
    >
      <Menu items={items} align={align} />
    </div>
  );
}
