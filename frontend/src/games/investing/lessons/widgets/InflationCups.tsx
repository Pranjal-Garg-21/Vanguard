/** Lab: how prices rise and how many cups a fixed sum buys. Maths in logic/explore.ts (inflationCups). */
import { useState } from 'react';
import { t } from '@/platform';
import { formatRupees, formatValue } from '../logic/calc';
import { inflationCups } from '../logic/explore';
import { LabBar, LabSlider, Readout } from './controls';

export function InflationCups({ price, inflation: i0, years: y0, money }: { price: number; inflation: number; years: number; money: number }) {
  const [ratePct, setRatePct] = useState(Math.round(i0 * 100));
  const [years, setYears] = useState(y0);
  const r = inflationCups(price, ratePct / 100, years, money);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <LabSlider id="ic-rate" label={t('investui.infl.rate')} shown={formatValue(ratePct / 100, 'percent')} min={2} max={12} step={1} value={ratePct} onChange={setRatePct} />
        <LabSlider id="ic-years" label={t('investui.infl.years')} shown={String(years)} min={0} max={30} step={1} value={years} onChange={setYears} />
      </div>
      <div aria-hidden="true" className="space-y-2">
        <LabBar label={t('investui.infl.now')} value={String(r.cupsNow)} fraction={1} colour="bg-muted" />
        <LabBar label={t('investui.infl.then')} value={String(r.cupsThen)} fraction={r.cupsNow ? r.cupsThen / r.cupsNow : 0} colour="bg-warn" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3" aria-live="polite">
        <Readout label={t('investui.infl.today', { price: formatRupees(price) })} value={formatRupees(price)} />
        <Readout label={t('investui.infl.price')} value={formatRupees(r.futurePrice, 2)} />
        <Readout label={t('investui.infl.buys', { money: formatRupees(money) })} value={t('investui.infl.cups', { now: r.cupsNow, then: r.cupsThen })} tone="bad" />
      </div>
    </div>
  );
}
