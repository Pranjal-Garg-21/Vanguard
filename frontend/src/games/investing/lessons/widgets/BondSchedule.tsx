/** Lab: what a bond pays, year by year. Maths in logic/explore.ts (bondSchedule). */
import { useState } from 'react';
import { t } from '@/platform';
import { formatRupees, formatValue } from '../logic/calc';
import { bondSchedule } from '../logic/explore';
import { LabBar, LabSlider, Readout } from './controls';

export function BondSchedule({ face, coupon: c0, years: y0 }: { face: number; coupon: number; years: number }) {
  const [couponPct, setCouponPct] = useState(Math.round(c0 * 100));
  const [years, setYears] = useState(y0);
  const r = bondSchedule(face, couponPct / 100, years);
  const biggest = Math.max(...r.payments);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">{t('investui.bond.face', { face: formatRupees(face) })}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <LabSlider id="bs-coupon" label={t('investui.bond.coupon')} shown={formatValue(couponPct / 100, 'percent')} min={2} max={12} step={1} value={couponPct} onChange={setCouponPct} />
        <LabSlider id="bs-years" label={t('investui.bond.years')} shown={String(years)} min={1} max={10} step={1} value={years} onChange={setYears} />
      </div>
      <ol className="space-y-2" aria-label={t('investui.bond.schedule')}>
        {r.payments.map((p, i) => (
          <li key={i}>
            <LabBar
              label={t('investui.bond.year', { n: i + 1 })}
              value={formatRupees(p)}
              fraction={p / biggest}
              colour={i === r.payments.length - 1 ? 'bg-brand' : 'bg-info'}
            />
          </li>
        ))}
      </ol>
      <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
        <Readout label={t('investui.bond.yearly')} value={formatRupees(r.yearlyInterest)} />
        <Readout label={t('investui.bond.total')} value={formatRupees(r.total)} tone="good" />
      </div>
    </div>
  );
}
