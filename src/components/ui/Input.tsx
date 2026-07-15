import { useMemo, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { cva, VariantProps } from 'class-variance-authority';
import { IconButton, IconButtonProps } from './IconButton';

const inputContainerVariants = cva(
  't-body flex items-center gap-2 transition-[colors,border] duration-150 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-fg disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        light:
          'border border-line bg-surface focus-within:border-line-strong has-[input[aria-invalid=true]]:border-2 has-[input[aria-invalid=true]]:border-solid-error',
        transparent: '',
      },
      size: {
        md: 'rounded-input px-3.5 py-0',
        lg: 'rounded-card-lg px-4.5 py-0',
      },
    },
    defaultVariants: {
      variant: 'light',
      size: 'md',
    },
  }
);

const inputVariants = cva(
  'min-w-0 flex-1 border-none bg-transparent py-2.5 outline-none placeholder:text-placeholder',
  {
    variants: {
      size: {
        md: 'py-2.5',
        lg: 'py-3.5',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.ComponentProps<'input'>, 'size'>, VariantProps<typeof inputContainerVariants> {
  leftIcon?: IconName;
  rightIcon?: IconName;
  actionIcon?: IconName;
  actionCallback?: () => void;
  actionSide?: 'left' | 'right';
  wrapperClassName?: string;
  actionShowIcon?: boolean;
  actionVariant?: IconButtonProps['variant'];
  actionSize?: IconButtonProps['size'];
  actionClassName?: string;
}

const InlineIcon = ({ name }: { name: IconName }) => {
  return <Icon name={name} className={cn('size-4.5 text-fg-muted')} />;
};

const InlineAction = ({
  name,
  onClick,
  actionVariant,
  actionSize,
  actionClassName,
}: {
  name: IconName;
  onClick?: () => void;
  actionVariant?: IconButtonProps['variant'];
  actionSize?: IconButtonProps['size'];
  actionClassName?: string;
}) => {
  return (
    <IconButton
      icon={name}
      variant={actionVariant}
      size={actionSize}
      className={actionClassName}
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
  size,
  actionVariant = 'ghost-hover',
  actionSize = 'sm',
  actionClassName,
  ...rest
}: InputProps) {
  return (
    <div
      className={cn(
        inputContainerVariants({ variant, size }),
        actionIcon && actionSide === 'right' && 'pr-2',
        actionIcon && actionSide === 'left' && 'pl-2',
        wrapperClassName
      )}
    >
      {leftIcon && <InlineIcon name={leftIcon} />}
      {actionIcon && actionShowIcon && actionSide === 'left' && (
        <InlineAction
          name={actionIcon}
          onClick={actionCallback}
          actionVariant={actionVariant}
          actionSize={actionSize}
          actionClassName={actionClassName}
        />
      )}
      <input className={cn(inputVariants({ size }), className)} {...rest} />
      {rightIcon && <InlineIcon name={rightIcon} />}
      {actionIcon && actionShowIcon && actionSide === 'right' && (
        <InlineAction
          name={actionIcon}
          onClick={actionCallback}
          actionVariant={actionVariant}
          actionSize={actionSize}
          actionClassName={actionClassName}
        />
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

export function InputTitle({
  className,
  children,
  required,
  ...props
}: React.ComponentProps<'div'> & {
  required?: boolean;
}) {
  return (
    <div className={cn('t-subtitle flex items-center gap-1 font-medium', className)} {...props}>
      <div>{children}</div>
      {required && <div className="text-solid-error">*</div>}
    </div>
  );
}
