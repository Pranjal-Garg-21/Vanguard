/** A room's guess-first step: the student commits a guess, then sees the model's answer and an honest range. */
import { logEvent, t } from '@/platform';
import { Predict } from '@/runtime/verbs/predict';
import { fillTemplate, formatRupees, formatValue, type Computed } from './logic/calc';
import type { PredictSpec } from './logic/types';

export function PredictStep({ roomId, predict, ctx }: { roomId: string; predict: PredictSpec; ctx: Record<string, Computed> }) {
  const tx = (key: string) => fillTemplate(t(key), ctx);
  const raw = (id?: string) => (id ? ctx[id]?.raw : undefined);
  const format = (n: number) =>
    predict.unit === 'rupees' ? formatRupees(n) : predict.unit === 'percent' ? formatValue(n, 'percent') : String(Math.round(n * 100) / 100);
  const low = raw(predict.rangeLow);
  const high = raw(predict.rangeHigh);

  return (
    <div className="rounded-xl border border-line border-l-4 border-l-info bg-surface p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('investui.card.predict')}</h3>
      <Predict
        question={tx(predict.questionKey)}
        slider={predict.slider}
        actual={raw(predict.actual) ?? 0}
        {...(low !== undefined ? { low } : {})}
        {...(high !== undefined ? { high } : {})}
        format={format}
        explanation={tx(predict.explainKey)}
        onDone={(r) =>
          void logEvent({
            mode: 'arcade',
            activity: roomId,
            concept: predict.concept,
            choice: `predict_gap_${Math.round(r.gapPct * 100)}`,
            level: 2,
            correct: r.inRange,
          })
        }
      />
    </div>
  );
}
