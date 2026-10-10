/** Lab: how fast, and at what cost, each asset turns back into cash. Maths in logic/explore.ts (cashSpeed). */
import { useState } from 'react';
import { assumptions } from '@/core/market';
import { t } from '@/platform';
import { formatRupees } from '../logic/calc';
import { cashSpeed } from '../logic/explore';
import { Readout } from './controls';

const ASSETS = ['steady_box', 'mixed_basket', 'bumpy_ride', 'gold', 'property'] as const;

export function CashSpeed({ amount }: { amount: number }) {
  const [asset, setAsset] = useState<(typeof ASSETS)[number]>('steady_box');
  const r = cashSpeed(amount, asset);
  const slowest = Math.max(...ASSETS.map((a) => assumptions.liquidity[a]?.days ?? 0));

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">{t('investui.cash.intro', { amount: formatRupees(amount) })}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('investui.cash.pick')}>
        {ASSETS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === asset}
            onClick={() => setAsset(id)}
            className={`min-h-11 rounded-lg border px-3 text-sm font-bold transition-colors ${
              id === asset ? 'border-brand bg-brand/15 text-brand' : 'border-line-strong text-ink-soft hover:border-brand'
            }`}
          >
            {t(`asset.${id}`)}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3" aria-live="polite">
        <Readout label={t('investui.cash.days')} value={t('investui.cash.daysValue', { n: r.days })} />
        <Readout label={t('investui.cash.cost')} value={formatRupees(r.cost)} tone={r.cost > 0 ? 'bad' : 'plain'} />
        <Readout label={t('investui.cash.received')} value={formatRupees(r.received)} tone="good" />
      </div>
      <div className="h-3 w-full rounded-full bg-surface-3" role="img" aria-label={t('investui.cash.days')}>
        <div className="h-3 rounded-full bg-brand transition-all" style={{ width: `${Math.max(2, (r.days / slowest) * 100)}%` }} />
      </div>
    </div>
  );
}
