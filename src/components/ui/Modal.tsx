import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useOutsideClick } from '@/lib/useOutsideClick';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  className?: string;
}

export function Modal({ open, onClose, title, children, footer, width = 520, className }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, onClose, open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal
        className={cn('flex max-h-[88vh] w-full flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-pop', className)}
        style={{ maxWidth: width }}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-divider px-5 py-4">
            <Text variant="card-title">{title}</Text>
            <IconButton icon="x" variant="ghost" size="sm" onClick={onClose} label="Close" />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-divider px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel = 'Delete', danger = true }: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={420}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
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
      {body && <Text variant="body" tone="secondary">{body}</Text>}
    </Modal>
  );
}
