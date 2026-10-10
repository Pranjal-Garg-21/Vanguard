/** Lab: owning shares. Change the price and the dividend and see the profit. Maths in logic/explore.ts (positionOutcome). */
import { useState } from 'react';
import { t } from '@/platform';
import { formatRupees, formatValue } from '../logic/calc';
import { positionOutcome } from '../logic/explore';
import { LabSlider, Readout } from './controls';

export function PositionLab({ shares, price, change: c0, dividend: d0, fee }: { shares: number; price: number; change: number; dividend: number; fee: number }) {
  const [changePct, setChangePct] = useState(Math.round(c0 * 100));
  const [dividend, setDividend] = useState(d0);
  const o = positionOutcome(shares, price, changePct / 100, dividend, fee);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        {t('investui.pos.intro', { shares, price: formatRupees(price), spent: formatRupees(o.spent), fee: formatValue(fee, 'percent', 1) })}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <LabSlider id="ps-change" label={t('investui.pos.change')} shown={`${changePct > 0 ? '+' : ''}${changePct}%`} min={-30} max={30} step={1} value={changePct} onChange={setChangePct} />
        <LabSlider id="ps-div" label={t('investui.pos.dividend')} shown={formatRupees(dividend, 1)} min={0} max={5} step={0.5} value={dividend} onChange={setDividend} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
        <Readout label={t('investui.pos.price')} value={formatRupees(o.nowPrice, 2)} />
        <Readout label={t('investui.pos.value')} value={formatRupees(o.valueNow, 2)} />
        <Readout label={t('investui.pos.divtotal')} value={formatRupees(o.dividend, 2)} />
        <Readout label={t('investui.pos.fee')} value={formatRupees(o.fee, 2)} />
      </div>
      <Readout label={t('investui.pos.profit')} value={formatRupees(o.profit, 2)} tone={o.profit < 0 ? 'bad' : 'good'} />
    </div>
  );
}
