/**
 * Starter components so screens look consistent before the design kit lands.
 * Written by P5 for the scaffold. Owner: P4, who may restyle or replace them
 * (keep the names and props, or update the callers).
 * Colours come from the tokens in src/index.css.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-brand-ink shadow-[0_3px_0_0_var(--color-brand-deep)] hover:bg-brand-hover active:translate-y-[3px] active:shadow-none disabled:bg-brand/30 disabled:shadow-none',
  secondary: 'border border-line-strong bg-surface-2 text-ink hover:border-brand hover:text-brand disabled:opacity-50',
  ghost: 'text-brand hover:bg-brand/10 disabled:opacity-50',
  danger: 'bg-bad text-white shadow-[0_3px_0_0_#b3263a] hover:brightness-110 active:translate-y-[3px] active:shadow-none disabled:opacity-50',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'md' | 'lg' }) {
  const sizing = size === 'lg' ? 'min-h-14 px-6 text-lg' : 'min-h-11 px-4';
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed ${sizing} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface p-5 ${className}`}>{children}</div>;
}

const BADGE_TONES = {
  neutral: 'bg-surface-3 text-ink-soft',
  good: 'bg-brand/15 text-brand',
  warn: 'bg-surface-3 text-ink',
  bad: 'bg-bad/15 text-bad',
  info: 'bg-surface-3 text-ink-soft',
};

/** Pill tag, styled like TryHackMe's Easy / Medium / Hard labels. */
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof BADGE_TONES }) {
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${BADGE_TONES[tone]}`}>{children}</span>;
}

export function Notice({ children, tone = 'warn' }: { children: ReactNode; tone?: 'warn' | 'bad' | 'info' }) {
  const tones = {
    warn: 'border-line-strong bg-surface-2 text-ink',
    bad: 'border-bad bg-bad/10 text-ink',
    info: 'border-brand bg-brand/10 text-ink',
  };
  return <div className={`rounded-lg border-l-4 p-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 p-8 font-mono text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line-strong border-t-brand" />
      {label}
    </div>
  );
}

/** Thin progress bar, like a room's completion bar. `value` is 0–1. */
export function ProgressBar({ value, tone = 'brand', className = '' }: { value: number; tone?: 'brand' | 'bad'; className?: string }) {
  const fill = { brand: 'bg-brand', bad: 'bg-bad' }[tone];
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-surface-3 ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${fill} transition-[width]`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Small uppercase heading above a group of cards. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="text-xs font-bold tracking-[0.15em] text-muted uppercase">{children}</h2>;
}
