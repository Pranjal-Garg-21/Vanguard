/** Lab: a mutual fund has one price a day; an ETF has a price you can pick during the day, plus a small trading cost. */
import { useState } from 'react';
import { t } from '@/platform';
import { formatRupees } from '../logic/calc';
import { etfBuy } from '../logic/explore';
import { Readout } from './controls';

const fmt = (n: number) => String(Number(n.toFixed(2)));
const TIMES = ['10am', '12pm', '3pm'];

export function EtfBuy({ amount, nav, prices, cost }: { amount: number; nav: number; prices: number[]; cost: number }) {
  const [pick, setPick] = useState(0);
  const price = prices[pick] ?? prices[0] ?? nav;
  const r = etfBuy(amount, nav, price, cost);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">{t('investui.etf.intro', { amount: formatRupees(amount), nav: formatRupees(nav) })}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('investui.etf.pick')}>
        {prices.map((p, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i === pick}
            onClick={() => setPick(i)}
            className={`min-h-11 rounded-lg border px-3 text-sm font-bold transition-colors ${
              i === pick ? 'border-brand bg-brand/15 text-brand' : 'border-line-strong text-ink-soft hover:border-brand'
            }`}
          >
            {t('investui.etf.at', { time: TIMES[i] ?? String(i + 1), price: formatRupees(p) })}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
        <div className="space-y-2 rounded-lg border border-line p-3">
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('investui.etf.fund')}</div>
          <Readout label={t('investui.etf.units')} value={fmt(r.fundUnits)} />
          <Readout label={t('investui.etf.tradeCost')} value={formatRupees(0)} />
        </div>
        <div className="space-y-2 rounded-lg border border-line p-3">
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('investui.etf.etf')}</div>
          <Readout label={t('investui.etf.units')} value={fmt(r.etfUnits)} tone="good" />
          <Readout label={t('investui.etf.tradeCost')} value={formatRupees(r.etfCost, 2)} />
        </div>
      </div>
    </div>
  );
}
