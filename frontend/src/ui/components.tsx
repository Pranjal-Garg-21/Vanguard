/**
 * Small app pieces that are not shadcn primitives: Spinner, ProgressBar (a thin wrapper over shadcn's Progress that takes
 * 0–1) and SectionLabel. The primitives themselves (Button, Card, Badge, Alert...) live in src/components/ui, shadcn style.
 * Owner: P4.
 */
import type { ReactNode } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export function Notice({ children, tone = 'warn' }: { children: ReactNode; tone?: 'warn' | 'bad' | 'info' }) {
  const tones = {
    warn: 'border-line-strong bg-surface-2 text-ink',
    bad: 'border-bad bg-bad/10 text-ink',
    info: 'border-brand bg-brand/10 text-ink',
  };
  return <div className={`rounded-lg border-s-4 p-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 p-8 font-mono text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line-strong border-t-primary" />
      {label}
    </div>
  );
}

/** Thin progress bar, like a room's completion bar. `value` is 0–1. */
export function ProgressBar({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'bad'; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return <Progress value={pct} className={className} indicatorClassName={cn(tone === 'bad' && 'bg-destructive')} />;
}

/** Small uppercase heading above a group of cards. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="text-xs font-bold tracking-[0.15em] text-muted uppercase">{children}</h2>;
}
