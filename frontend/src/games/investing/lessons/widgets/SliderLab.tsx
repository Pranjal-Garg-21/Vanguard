/** Lab built only from lesson data: sliders in, live readouts out. Maths in logic/explore.ts (evalLab). */
import { useState } from 'react';
import { formatValue } from '@/core/market';
import { t } from '@/platform';
import { lookup } from '../logic/calc';
import { evalLab } from '../logic/explore';
import type { LabSpec } from '../logic/types';
import { LabSlider, Readout } from './controls';

export function SliderLab({ lab, params }: { lab: LabSpec; params: Record<string, number> }) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(lab.sliders.map((s) => [s.id, params[s.id] ?? s.min])),
  );
  const out = evalLab(lab, params, values, lookup);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {lab.sliders.map((s) => (
          <LabSlider
            key={s.id}
            id={`lab-${s.id}`}
            label={t(s.labelKey)}
            shown={formatValue(values[s.id] ?? s.min, s.fmt, s.fmt === 'percent' ? 1 : 0)}
            min={s.min}
            max={s.max}
            step={s.step}
            value={values[s.id] ?? s.min}
            onChange={(n) => setValues((v) => ({ ...v, [s.id]: n }))}
          />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3" aria-live="polite">
        {lab.readouts.map((r) => (
          <Readout key={r.id} label={t(r.labelKey)} value={formatValue(out[r.id] ?? 0, r.fmt, r.fmt === 'percent' ? 1 : 0)} tone={r.tone ?? 'plain'} />
        ))}
      </div>
    </div>
  );
}
