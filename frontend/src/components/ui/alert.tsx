import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('rounded-lg border-s-4 p-3 text-sm', {
  variants: {
    variant: {
      warn: 'border-line-strong bg-secondary text-foreground',
      bad: 'border-destructive bg-destructive/10 text-foreground',
      info: 'border-primary bg-primary/10 text-foreground',
    },
  },
  defaultVariants: { variant: 'warn' },
});

function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<'h5'>) {
  return <h5 data-slot="alert-title" className={cn('font-bold', className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-description" className={cn(className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription };
