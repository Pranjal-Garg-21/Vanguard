/** Lab: a small yearly fee, compounded, costs a lot over time. Maths in logic/explore.ts (feeCompare). */
import { useState } from 'react';
import { t } from '@/platform';
import { formatRupees, formatValue } from '../logic/calc';
import { feeCompare } from '../logic/explore';
import { LabSlider, Readout } from './controls';

export function FeeDrag({ monthly, gross, years: y0 }: { monthly: number; gross: number; years: number }) {
  const [years, setYears] = useState(y0);
  const [feeA, setFeeA] = useState(0.5);
  const [feeB, setFeeB] = useState(2);
  const r = feeCompare(monthly, gross, years, feeA / 100, feeB / 100);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">{t('investui.fee.intro', { monthly: formatRupees(monthly), gross: formatValue(gross, 'percent') })}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <LabSlider id="fd-years" label={t('investui.fee.years')} shown={String(years)} min={1} max={30} step={1} value={years} onChange={setYears} />
        <LabSlider id="fd-a" label={t('investui.fee.a')} shown={`${feeA}%`} min={0} max={3} step={0.5} value={feeA} onChange={setFeeA} />
        <LabSlider id="fd-b" label={t('investui.fee.b')} shown={`${feeB}%`} min={0} max={3} step={0.5} value={feeB} onChange={setFeeB} />
      </div>
      <div className="grid gap-3 sm:grid-cols-4" aria-live="polite">
        <Readout label={t('investui.fee.putIn')} value={formatRupees(r.putIn)} />
        <Readout label={t('investui.fee.endA')} value={formatRupees(r.a)} tone="good" />
        <Readout label={t('investui.fee.endB')} value={formatRupees(r.b)} />
        <Readout label={t('investui.fee.gap')} value={formatRupees(r.gap)} tone="bad" />
      </div>
    </div>
  );
}
