/**
 * The shadcn Badge, which also answers to `tone`.
 *
 * The design kit calls this prop `variant`; Stay Safe, the dashboard and the
 * facilitator pages call it `tone`. They mean the same five values, and
 * renaming sixteen call sites inside a merge is how a demo breaks. P4 can
 * settle on one name later and delete this file.
 */
import type { ComponentProps } from 'react';
import { Badge as Base } from '@/components/ui/badge';

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info';

export function Badge({ tone, variant, ...props }: Omit<ComponentProps<typeof Base>, 'variant'> & { tone?: Tone; variant?: Tone }) {
  return <Base variant={variant ?? tone ?? 'neutral'} {...props} />;
}
