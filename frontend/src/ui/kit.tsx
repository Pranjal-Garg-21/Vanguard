/**
 * Design kit pieces beyond the starter set in components.tsx: Meter, CoinStack, BottomSheet, Dialog, LockedTile,
 * Toast and AudioButton. Built on the shadcn primitives in src/components/ui. All use the colour tokens in index.css and logical (start/end) spacing so right-to-left works.
 * Owner: P4. See the /gallery page for every state.
 */
import { useEffect, type ReactNode } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { t } from '@/platform';

/* ------------------------------------------------------------------ Meter */

const METER_TONES = { brand: 'bg-primary', info: 'bg-info', warn: 'bg-warn', bad: 'bg-destructive', xp: 'bg-xp' } as const;

/** A labelled meter (cash, trust, a goal). The number is always written, so colour is never the only signal. */
export function Meter({
  label,
  value,
  max = 100,
  tone = 'brand',
  valueText,
}: {
  label: string;
  value: number;
  max?: number;
  tone?: keyof typeof METER_TONES;
  /** Override the number shown, for example "₹4,000". */
  valueText?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value / max)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-sm">
        <span className="text-ink-soft">{label}</span>
        <span className="font-bold text-ink">{valueText ?? `${pct}%`}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-3" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-valuetext={valueText ?? `${pct}%`}>
        <div className={cn('h-full rounded-full transition-[width] duration-500', METER_TONES[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- CoinStack */

/** A stack of coins that grows with an amount, for a quick feel of "how much". `unit` is rupees per coin. */
export function CoinStack({ amount, unit = 1000, maxCoins = 10, label }: { amount: number; unit?: number; maxCoins?: number; label: string }) {
  const coins = Math.min(maxCoins, Math.max(amount > 0 ? 1 : 0, Math.round(amount / unit)));
  return (
    <div className="inline-flex flex-col items-center gap-1" role="img" aria-label={label}>
      <div className="flex flex-col-reverse items-center">
        {Array.from({ length: coins }, (_, i) => (
          <span key={i} className="-mt-1.5 block h-3 w-12 rounded-full border border-warn/70 bg-warn first:mt-0" aria-hidden="true" />
        ))}
        {coins === 0 && <span className="block h-3 w-12 rounded-full border border-dashed border-line-strong" aria-hidden="true" />}
      </div>
      <span className="text-xs font-bold text-ink-soft">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------ BottomSheet */

/** A panel that rises from the bottom. Built on shadcn's Sheet (Radix): focus stays inside, Escape closes, focus goes back. */
export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {children}
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="secondary">{t('ui.close')}</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ----------------------------------------------------------------- Dialog */

/** A small centred question with two choices, for things that cannot be undone ("Start over?"). Built on shadcn's AlertDialog. */
export function Dialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = t('ui.cancel'),
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ------------------------------------------------------------- LockedTile */

/** A tile that is not open yet, with the reason in one line (the reason itself teaches the order of things). */
export function LockedTile({ title, reason, action }: { title: string; reason: string; action?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-line-strong bg-surface/60 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-3 text-ink-soft" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-bold text-ink">{title}</p>
        <p className="text-sm text-ink-soft">
          <span className="sr-only">{t('ui.locked')}: </span>
          {reason}
        </p>
        {action && <div className="pt-1">{action}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Toast */

/** A short message that goes away by itself. Controlled: show it by rendering it, hide it in onClose. */
export function Toast({ message, tone = 'info', onClose, ms = 4000 }: { message: string; tone?: 'info' | 'good' | 'warn'; onClose: () => void; ms?: number }) {
  useEffect(() => {
    const id = window.setTimeout(onClose, ms);
    return () => window.clearTimeout(id);
  }, [message, ms, onClose]);
  const edge = { info: 'border-s-info', good: 'border-s-brand', warn: 'border-s-warn' }[tone];
  return (
    <div role="status" className={`fixed bottom-4 start-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-line border-s-4 bg-surface-2 p-3 text-ink shadow-lg rtl:translate-x-1/2 ${edge}`}>
      <div className="flex items-start justify-between gap-3">
        <p>{message}</p>
        <button type="button" onClick={onClose} aria-label={t('ui.close')} className="min-h-8 min-w-8 text-ink-soft hover:text-ink">
          ×
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ AudioButton */

/** True when the browser can read text aloud. */
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

/**
 * "Listen": reads the text aloud with the browser's own voice. A stand-in until recorded audio (P3's audio hook)
 * is available. Renders nothing where speech is not supported, so a missing voice never leaves a dead button.
 */
export function AudioButton({ text, lang = 'en-IN', label }: { text: string; lang?: string; label?: string }) {
  if (!canSpeak()) return null;
  const speak = () => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    window.speechSynthesis.speak(u);
  };
  return (
    <button
      type="button"
      onClick={speak}
      aria-label={label ?? t('ui.listen')}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-line-strong px-2 text-sm font-bold text-ink-soft hover:border-brand hover:text-brand"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      </svg>
      {t('ui.listen')}
    </button>
  );
}
