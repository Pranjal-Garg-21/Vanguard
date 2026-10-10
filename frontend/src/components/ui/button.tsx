import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_3px_0_0_var(--color-brand-deep)] hover:bg-brand-hover active:translate-y-[3px] active:shadow-none disabled:bg-primary/30 disabled:shadow-none',
        secondary: 'border border-line-strong bg-secondary text-secondary-foreground hover:border-primary hover:text-primary disabled:opacity-50',
        ghost: 'text-primary hover:bg-primary/10 disabled:opacity-50',
        destructive: 'bg-destructive text-white shadow-[0_3px_0_0_#b3263a] hover:brightness-110 active:translate-y-[3px] active:shadow-none disabled:opacity-50',
      },
      // Both sizes keep a touch target of at least 44px (the plan's accessibility rule).
      size: {
        default: 'min-h-11 px-4',
        lg: 'min-h-14 px-6 text-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
