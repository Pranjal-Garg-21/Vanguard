/** Lab: the same rupees each month buy more units when the price is low. Maths in logic/explore.ts (sipUnits). */
import { useState } from 'react';
import { t } from '@/platform';
import { formatRupees } from '../logic/calc';
import { sipUnits } from '../logic/explore';
import { LabBar, LabSlider, Readout } from './controls';

const fmt = (n: number) => String(Number(n.toFixed(2)));

export function SipUnits({ amount, navs: start }: { amount: number; navs: number[] }) {
  const [navs, setNavs] = useState(start);
  const r = sipUnits(amount, navs);
  const top = Math.max(...r.units);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">{t('investui.sip.intro', { amount: formatRupees(amount) })}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {navs.map((nav, i) => (
          <LabSlider
            key={i}
            id={`sip-${i}`}
            label={t('investui.sip.month', { n: i + 1 })}
            shown={formatRupees(nav)}
            min={50}
            max={150}
            step={5}
            value={nav}
            onChange={(v) => setNavs((prev) => prev.map((x, j) => (j === i ? v : x)))}
          />
        ))}
      </div>
      <div className="space-y-2" aria-live="polite">
        {r.units.map((u, i) => (
          <LabBar key={i} label={t('investui.sip.unitsIn', { n: i + 1, nav: formatRupees(navs[i]!) })} value={fmt(u)} fraction={u / top} />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Readout label={t('investui.sip.total')} value={fmt(r.totalUnits)} tone="good" />
        <Readout label={t('investui.sip.avgCost')} value={formatRupees(r.averageCost, 2)} />
        <Readout label={t('investui.sip.avgNav')} value={formatRupees(r.averageNav, 2)} />
      </div>
    </div>
  );
}
