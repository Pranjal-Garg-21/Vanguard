import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

/** Thin progress bar. `value` is 0–100 (shadcn's convention); `indicatorClassName` recolours the fill. The fill uses width, not a translate, so it grows from the right in right-to-left. */
function Progress({ className, indicatorClassName, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }) {
  return (
    <ProgressPrimitive.Root data-slot="progress" value={value} className={cn('relative h-2 w-full overflow-hidden rounded-full bg-surface-3', className)} {...props}>
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn('h-full rounded-full bg-primary transition-[width]', indicatorClassName)}
        style={{ width: `${value ?? 0}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
