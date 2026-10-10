import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/** Pill tag, styled like TryHackMe's Easy / Medium / Hard labels. */
const badgeVariants = cva('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide', {
  variants: {
    variant: {
      neutral: 'bg-surface-3 text-ink-soft',
      good: 'bg-primary/15 text-primary',
      warn: 'bg-surface-3 text-foreground',
      bad: 'bg-destructive/15 text-destructive',
      info: 'bg-surface-3 text-ink-soft',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
