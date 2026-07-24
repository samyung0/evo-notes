import { toast as sonnerToast } from 'sonner';
import { Card } from './Card';
import { IconButton } from './IconButton';
import { Button } from './Button';
import { cva, VariantProps } from 'class-variance-authority';
import { Icon } from './Icon';
import { cn } from '@/lib/cn';

const sonnerCardVariants = cva(
  'items-top pointer-events-auto relative z-9999 w-full min-w-64 flex-row p-4 shadow-card md:max-w-91',
  {
    variants: {
      variant: {
        default: '',
        error: 'border-tint-error bg-tint-error text-tint-error-fg md:max-w-96',
        warning: 'border-tint-warning bg-tint-warning text-tint-warning-fg md:max-w-96',
        success: 'border-tint-success bg-tint-success text-tint-success-fg md:max-w-96',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Toast(props: ToastProps) {
  const { title, description, button, id, showCloseButton = true, variant = 'default' } = props;
  return (
    <Card radius="row" border="solid" className={cn(sonnerCardVariants({ variant }))}>
      {showCloseButton && (
        <IconButton
          icon="x"
          variant="outline"
          className="absolute -top-2 -left-2 rounded-md p-1 [&>svg]:size-3"
          size="xs"
          onClick={() => {
            sonnerToast.dismiss(id);
          }}
        >
          <span className="sr-only">Close</span>
        </IconButton>
      )}
      <div className="items-top flex flex-1 gap-1.5">
        {variant === 'error' && (
          <Icon name="error" strokeWidth={2} className="mr-2 size-5 -translate-y-px" />
        )}
        {variant === 'warning' && (
          <Icon name="warning" strokeWidth={2} className="mr-2 size-5 -translate-y-px" />
        )}
        {variant === 'success' && (
          <Icon name="check" strokeWidth={2} className="mr-2 size-5 -translate-y-px" />
        )}
        <div className="w-full">
          <p
            className={cn(
              'flex items-start font-medium',
              (variant === 'warning' || variant === 'error') && 'font-bold'
            )}
          >
            <span>{title}</span>
          </p>
          <p className="mt-1 text-fg-muted">{description}</p>
        </div>
      </div>
      {button && (
        <div className="ml-5 shrink-0">
          <Button
            size="sm"
            className="translate-y-1 rounded-md px-2.5 py-1"
            onClick={() => {
              button.onClick();
              sonnerToast.dismiss(id);
            }}
          >
            {button.label}
          </Button>
        </div>
      )}
    </Card>
  );
}

interface ToastProps extends VariantProps<typeof sonnerCardVariants> {
  id: string | number;
  title: string;
  description?: string;
  showCloseButton?: boolean;
  button?: {
    label: string;
    onClick: () => void;
  };
}

export { Toast, type ToastProps };
