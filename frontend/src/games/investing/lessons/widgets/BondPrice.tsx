/** Lab: what an existing bond is worth when the rate on new bonds changes. Maths in logic/explore.ts (bondPriceAt). */
import { useState } from 'react';
import { t } from '@/platform';
import { formatRupees, formatValue } from '../logic/calc';
import { bondPriceAt } from '../logic/explore';
import { LabBar, LabSlider, Readout } from './controls';

export function BondPrice({ face, coupon, market: m0, years }: { face: number; coupon: number; market: number; years: number }) {
  const [marketPct, setMarketPct] = useState(Math.round(m0 * 100));
  const r = bondPriceAt(face, coupon, marketPct / 100, years);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        {t('investui.bondp.intro', { face: formatRupees(face), coupon: formatValue(coupon, 'percent'), years })}
      </p>
      <LabSlider id="bp-market" label={t('investui.bondp.market')} shown={formatValue(marketPct / 100, 'percent')} min={3} max={12} step={1} value={marketPct} onChange={setMarketPct} />
      <div aria-hidden="true" className="space-y-2">
        <LabBar label={t('investui.bondp.faceLabel')} value={formatRupees(face)} fraction={1} colour="bg-muted" />
        <LabBar label={t('investui.bondp.price')} value={formatRupees(r.price)} fraction={r.price / Math.max(face, r.price)} colour={r.difference < 0 ? 'bg-warn' : 'bg-brand'} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
        <Readout label={t('investui.bondp.price')} value={formatRupees(r.price)} />
        <Readout label={t('investui.bondp.diff')} value={formatRupees(r.difference)} tone={r.difference < 0 ? 'bad' : 'good'} />
      </div>
    </div>
  );
}
