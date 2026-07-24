import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';

function ContextMenu(props: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root {...props} />;
}

function ContextMenuTrigger(props: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />;
}

function ContextMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        className={cn(
          'z-50 min-w-40 overflow-hidden rounded-card border border-line bg-surface p-1 text-fg shadow-pop outline-none',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuGroup(props: React.ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />;
}

function ContextMenuItem({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & { inset?: boolean }) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset || undefined}
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-row px-2 py-1.5 text-sm outline-none select-none',
        'focus:bg-surface-hover-bg data-highlighted:bg-surface-hover-bg',
        'data-disabled:pointer-events-none data-disabled:opacity-40',
        'data-inset:pl-8 [&_svg]:size-4 [&_svg]:shrink-0',
        className
      )}
      {...props}
    />
  );
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn('-mx-1 my-1 h-px bg-divider', className)}
      {...props}
    />
  );
}

function ContextMenuSub(props: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub {...props} />;
}

function ContextMenuSubTrigger({
  children,
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset || undefined}
      className={cn(
        'flex cursor-default items-center gap-2 rounded-row px-2 py-1.5 text-sm outline-none select-none',
        'focus:bg-surface-hover-bg data-highlighted:bg-surface-hover-bg data-[state=open]:bg-surface-hover-bg',
        'data-disabled:pointer-events-none data-disabled:opacity-40 data-inset:pl-8',
        '[&_svg]:size-4 [&_svg]:shrink-0',
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto size-4 text-fg-muted" />
    </ContextMenuPrimitive.SubTrigger>
  );
}

function ContextMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent
        data-slot="context-menu-sub-content"
        className={cn(
          'z-50 min-w-40 overflow-hidden rounded-card border border-line bg-surface p-1 text-fg shadow-pop outline-none',
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

export {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
