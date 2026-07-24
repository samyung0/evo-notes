import * as React from 'react';

import { cn } from '@/lib/cn';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'placeholder:text-muted-foreground disabled:bg-input/50 flex field-sizing-content min-h-16 w-full rounded-card border border-line bg-surface px-3 py-2 text-base transition-[colors,border] duration-150 outline-none focus:border-line-strong disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-2 aria-invalid:border-solid-error md:text-sm',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
