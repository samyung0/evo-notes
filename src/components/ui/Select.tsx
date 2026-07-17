import * as React from 'react';
import { Select as SelectPrimitive } from 'radix-ui';
import { cva, VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';
import { Icon } from './Icon';

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn('scroll-my-1 p-1', className)}
      {...props}
    />
  );
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

const selectTriggerVariants = cva(
  'flex w-full items-center justify-between gap-2 bg-surface text-left hover:border-line-strong focus-visible:border-line-strong disabled:cursor-not-allowed disabled:opacity-40 data-[state=open]:border-line-strong',
  {
    variants: {
      size: {
        sm: 'px-2.5 pt-2 pb-0.5 text-xs',
        md: 'px-3.25 py-2.5',
      },
      variant: {
        border: 'rounded-input border border-line',
        underline: 'border-b border-line',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'border',
    },
  }
);

function SelectTrigger({
  className,
  size = 'md',
  variant = 'border',
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> &
  VariantProps<typeof selectTriggerVariants>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      data-variant={variant}
      className={cn(selectTriggerVariants({ size, variant }), className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <Icon name="chevronDown" className="size-4 text-fg-muted" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = 'popper',
  align = 'center',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        data-align-trigger={position === 'item-aligned'}
        className={cn(
          'relative z-100 max-h-(--radix-select-content-available-height) min-w-36 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-row border border-line bg-surface duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=close]:animate-out data-[state=close]:fade-out-0 data-[state=close]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          data-position={position}
          className={cn(
            'data-[position=popper]:h-(--radix-select-trigger-height) data-[position=popper]:w-full data-[position=popper]:min-w-(--radix-select-trigger-width)',
            position === 'popper' && ''
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('t-label px-1.5 py-1', className)}
      {...props}
    />
  );
}

const selectItemVariants = cva(
  "relative flex w-full cursor-pointer items-center gap-1.5 rounded-row bg-surface text-left font-medium text-fg outline-hidden transition-colors select-none hover:bg-surface-hover-bg disabled:opacity-40 data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
  {
    variants: {
      size: {
        sm: 'px-2.5 py-2 text-xs',
        md: 'px-3.25 py-2.5',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

function SelectItem({
  className,
  children,
  disabled,
  size = 'md',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item> & VariantProps<typeof selectItemVariants>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      data-size={size}
      disabled={disabled}
      className={cn(selectItemVariants({ size }), disabled && 'opacity-50', className)}
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Icon name="check" className="pointer-events-none" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('pointer-events-none mx-3 my-1 h-px bg-line', className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <Icon name="chevronUp" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <Icon name="chevronDown" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
