/**
 * "Assumptions" chip that opens a bottom sheet listing the numbers behind a projection.
 * Reads src/content/assumptions.json, so what the student sees is what the engine used.
 * Owner: P4. Part of the guardrails.
 */
import { useEffect, useRef, useState } from 'react';
import { assumptions, formatValue } from '@/core/market';
import { t } from '@/platform';
import { Button } from './components';

export interface AssumptionsDrawerProps {
  /** Which assets to list (ids from assumptions.json). Defaults to all of them. */
  assetIds?: string[];
  /** Show the inflation section. Default true; games that do not use inflation turn it off. */
  showInflation?: boolean;
  /** Extra lines under "What this uses", for numbers the game takes from elsewhere (a fee, a price model). */
  notes?: string[];
  /** When given, the student can change the inflation rate and see the chart move. */
  inflation?: { value: number; onChange: (next: number) => void };
  className?: string;
}

const pct = (n: number) => formatValue(n, 'percent', 1);

export function AssumptionsDrawer({ assetIds, showInflation = true, notes, inflation, className = '' }: AssumptionsDrawerProps) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const ids = assetIds ?? Object.keys(assumptions.assets);
  const inflationNow = inflation?.value ?? assumptions.inflation.base;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const chip = chipRef.current;
    return () => {
      window.removeEventListener('keydown', onKey);
      chip?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={chipRef}
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface-2 px-4 text-sm font-bold text-ink-soft hover:border-brand hover:text-brand ${className}`}
      >
        <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs">
          i
        </span>
        {t('assume.chip')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assume-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 sm:p-6"
          >
            <header className="space-y-1">
              <h2 id="assume-title" className="text-xl font-bold text-ink">
                {t('assume.title')}
              </h2>
              <p className="text-sm text-ink-soft">{t('assume.intro')}</p>
            </header>

            {ids.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('assume.rates.title')}</h3>
              <ul className="space-y-2">
                {ids.map((id) => {
                  const a = assumptions.assets[id];
                  if (!a) return null;
                  return (
                    <li key={id} className="rounded-lg bg-surface-2 p-3">
                      <p className="font-bold text-ink">{t(a.labelKey)}</p>
                      <p className="text-sm text-ink-soft">
                        {t('assume.rates.row', { mean: pct(a.meanAnnual), vol: pct(a.volAnnual), fee: pct(a.fee) })}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
            )}

            {notes && notes.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('assume.notes.title')}</h3>
                <ul className="list-disc space-y-1 ps-5 text-ink-soft">
                  {notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            )}

            {showInflation && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('assume.inflation.title')}</h3>
              <p className="text-ink">{t('assume.inflation.row', { rate: pct(inflationNow) })}</p>
              {inflation && (
                <label className="block space-y-1 text-sm text-ink-soft">
                  {t('assume.inflation.change')}
                  <input
                    type="range"
                    min={assumptions.inflation.low}
                    max={assumptions.inflation.high}
                    step={0.005}
                    value={inflation.value}
                    onChange={(e) => inflation.onChange(Number(e.target.value))}
                    className="h-11 w-full accent-brand"
                  />
                </label>
              )}
            </section>
            )}

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('assume.ignores.title')}</h3>
              <ul className="list-disc space-y-1 ps-5 text-ink-soft">
                <li>{t('assume.ignores.tax')}</li>
                <li>{t('assume.ignores.surprises')}</li>
                <li>{t('assume.ignores.behaviour')}</li>
              </ul>
            </section>

            <footer className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted">{t('assume.version', { n: assumptions.version })}</span>
              <Button ref={closeRef} variant="secondary" onClick={() => setOpen(false)}>
                {t('assume.close')}
              </Button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
