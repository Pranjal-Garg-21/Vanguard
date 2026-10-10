/** Lab: spread money over businesses and see what one fall (or a market-wide fall) costs. Maths in logic/explore.ts (basketSplit). */
import { useState } from 'react';
import { t } from '@/platform';
import { formatRupees, formatValue } from '../logic/calc';
import { basketSplit } from '../logic/explore';
import { LabSlider, Readout } from './controls';

export function BasketSplit({ total, fall: f0 }: { total: number; fall: number }) {
  const [count, setCount] = useState(1);
  const [fallPct, setFallPct] = useState(Math.round(f0 * 100));
  const [scope, setScope] = useState<'one' | 'market'>('one');
  const r = basketSplit(total, fallPct / 100, count, scope);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">{t('investui.basket.intro', { total: formatRupees(total) })}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <LabSlider id="bs-count" label={t('investui.basket.count')} shown={String(count)} min={1} max={6} step={1} value={count} onChange={setCount} />
        <LabSlider id="bs-fall" label={t('investui.basket.fall')} shown={formatValue(fallPct / 100, 'percent')} min={10} max={60} step={5} value={fallPct} onChange={setFallPct} />
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('investui.basket.scope')}>
        {(['one', 'market'] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={s === scope}
            onClick={() => setScope(s)}
            className={`min-h-11 rounded-lg border px-3 text-sm font-bold transition-colors ${
              s === scope ? 'border-brand bg-brand/15 text-brand' : 'border-line-strong text-ink-soft hover:border-brand'
            }`}
          >
            {t(`investui.basket.scope.${s}`)}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3" aria-live="polite">
        <Readout label={t('investui.basket.each')} value={formatRupees(r.eachSlice)} />
        <Readout label={t('investui.basket.loss')} value={formatRupees(r.loss)} tone={r.loss > 0 ? 'bad' : 'plain'} />
        <Readout label={t('investui.basket.left')} value={formatRupees(r.left)} />
      </div>
    </div>
  );
}
