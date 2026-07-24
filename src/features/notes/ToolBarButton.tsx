import { cn } from '@/lib/cn';

export function ToolbarButton({
  label,
  children,
  onClick,
  active,
  disabled,
  className,
  ...rest
}: React.ComponentProps<'button'> & {
  label: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-slot="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      data-plate-prevent-deselect
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'relative inline-flex size-8 shrink-0 items-center justify-center gap-1 rounded-row px-0.5 outline-none',
        'focus-visible:ring-focus hover:bg-surface-hover-bg hover:text-fg focus-visible:ring-2',
        'disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4',
        'font-semibold whitespace-nowrap transition-all duration-150 outline-none select-none',
        // active && 'bg-tint-accent-1/35 text-tint-accent-1-fg',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
