import { useMemo, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { cva, VariantProps } from 'class-variance-authority';
import { IconButton } from './IconButton';

const inputVariants = cva(
  't-body flex items-center gap-2 rounded-input p-0 px-3.5 transition-[colors,border] duration-150 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-fg disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        light:
          'border border-line bg-surface focus-within:border-line-strong has-[input[aria-invalid=true]]:border-2 has-[input[aria-invalid=true]]:border-solid-error',

        transparent: '',
      },
    },
    defaultVariants: {
      variant: 'light',
    },
  }
);

export interface InputProps
  extends Omit<React.ComponentProps<'input'>, 'size'>, VariantProps<typeof inputVariants> {
  leftIcon?: IconName;
  rightIcon?: IconName;
  actionIcon?: IconName;
  actionCallback?: () => void;
  actionSide?: 'left' | 'right';
  wrapperClassName?: string;
  actionShowIcon?: boolean;
}

const InlineIcon = ({ name }: { name: IconName }) => {
  return <Icon name={name} className={cn('size-4.5 text-fg-muted')} />;
};

const InlineAction = ({ name, onClick }: { name: IconName; onClick?: () => void }) => {
  return (
    <IconButton
      icon={name}
      variant="ghost-hover"
      size={'xs'}
      className={'text-fg-muted'}
      onClick={onClick}
    />
  );
};

export function Input({
  leftIcon,
  rightIcon,
  wrapperClassName,
  actionIcon,
  actionSide = 'right',
  actionCallback,
  actionShowIcon = true,
  className,
  variant,
  ...rest
}: InputProps) {
  return (
    <div
      className={cn(
        inputVariants({ variant }),
        actionIcon && actionSide === 'right' && 'pr-2',
        actionIcon && actionSide === 'left' && 'pl-2',
        wrapperClassName
      )}
    >
      {leftIcon && <InlineIcon name={leftIcon} />}
      {actionIcon && actionShowIcon && actionSide === 'left' && (
        <InlineAction name={actionIcon} onClick={actionCallback} />
      )}
      <input
        className={cn(
          'min-w-0 flex-1 border-none bg-transparent py-2.5 outline-none placeholder:text-placeholder',
          className
        )}
        {...rest}
      />
      {rightIcon && <InlineIcon name={rightIcon} />}
      {actionIcon && actionShowIcon && actionSide === 'right' && (
        <InlineAction name={actionIcon} onClick={actionCallback} />
      )}
    </div>
  );
}

export function InputError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<'div'> & {
  errors?: Array<{ message?: string } | undefined>;
}) {
  const content = useMemo(() => {
    if (children) {
      return children;
    }
    if (!errors?.length) {
      return null;
    }
    const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()];
    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message;
    }
    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map((error, index) => error?.message && <li key={index}>{error.message}</li>)}
      </ul>
    );
  }, [children, errors]);
  if (!content) {
    return null;
  }
  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn('mt-1.5 text-solid-error', className)}
      {...props}
    >
      {content}
    </div>
  );
}
