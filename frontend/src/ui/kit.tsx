/**
 * Design kit pieces beyond the starter set in components.tsx: Meter, CoinStack, BottomSheet, Dialog, LockedTile,
 * Toast and AudioButton. All use the colour tokens in index.css and logical (start/end) spacing so right-to-left works.
 * Owner: P4. See the /gallery page for every state.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '@/platform';
import { Button } from './components';

/* ------------------------------------------------------------------ Meter */

const METER_TONES = { brand: 'bg-brand', info: 'bg-info', warn: 'bg-warn', bad: 'bg-bad', xp: 'bg-xp' } as const;

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
        <div className={`h-full rounded-full ${METER_TONES[tone]} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
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

/** Keeps focus inside while open, closes on Escape, and gives focus back to what opened it. */
function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.hasAttribute('disabled'));
      if (items.length === 0) return;
      const a = items[0]!;
      const z = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open, onClose]);
  return ref;
}

export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useModal(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 sm:p-6"
      >
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        {children}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            {t('ui.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Dialog */

/** A small centred question with two choices, for things that cannot be undone ("Start over?"). */
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
  const ref = useModal(open, onCancel);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div ref={ref} role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        <p className="text-ink-soft">{body}</p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
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
  const edge = { info: 'border-l-info', good: 'border-l-brand', warn: 'border-l-warn' }[tone];
  return (
    <div role="status" className={`fixed bottom-4 start-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-line border-l-4 bg-surface-2 p-3 text-ink shadow-lg rtl:translate-x-1/2 ${edge}`}>
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
