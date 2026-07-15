import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';

import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';
import { Button } from './Button';
import { Text } from './Text';
import { Card } from '@/components/ui/Card';

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 isolate z-50 bg-black/10 duration-100 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 supports-backdrop-filter:backdrop-blur-xs',
        className
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  cardClassName,
  cardScrollContainerClassName,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  cardClassName?: string;
  cardScrollContainerClassName?: string;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 px-4 duration-100 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      >
        <Card
          radius="card-lg"
          raised
          className={cn('relative w-full items-stretch gap-0 overflow-hidden p-0', cardClassName)}
        >
          <div
            className={cn(
              'flex max-h-[88vh] w-full flex-col items-stretch gap-0 overflow-auto p-5.5',
              cardScrollContainerClassName
            )}
          >
            {children}
            {showCloseButton && (
              <DialogPrimitive.Close data-slot="dialog-close" asChild>
                <IconButton
                  icon="x"
                  variant="ghost-hover"
                  className="absolute top-4 right-4"
                  size="md"
                >
                  <span className="sr-only">Close</span>
                </IconButton>
              </DialogPrimitive.Close>
            )}
          </div>
        </Card>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('t-section flex items-center justify-between pt-0 pb-6', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        '-mx-4 -mb-4 flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Convenience wrapper for the common "title + body + footer" dialog. Built on
 * the Radix primitives above so every modal in the app shares the same
 * open/close animation. Mirrors the old `Modal` API for a drop-in swap.
 */
function SimpleDialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  showCloseButton = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
  className?: string;
  showCloseButton?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={showCloseButton} className={className}>
        {title != null && <DialogTitle className="pr-10 pb-4">{title}</DialogTitle>}
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
}

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = 'Delete',
  danger = true,
}: ConfirmDialogProps) {
  return (
    <SimpleDialog
      open={open}
      onClose={onClose}
      title={title}
      width={420}
      footer={
        <>
          <Button variant="ghost-hover" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'primary' : 'accent'}
            className={danger ? 'bg-solid-error text-white hover:brightness-95' : undefined}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {body && (
        <Text variant="body" tone="secondary">
          {body}
        </Text>
      )}
    </SimpleDialog>
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  SimpleDialog,
  ConfirmDialog,
  type ConfirmDialogProps,
};
