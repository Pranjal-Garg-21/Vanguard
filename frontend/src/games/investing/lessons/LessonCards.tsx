/** The cards a lesson is made of. One card = one idea, readable in about 20 seconds. */
import { useState } from 'react';
import { t } from '@/platform';
import { Predict } from '@/runtime/verbs/predict';
import { Button } from '@/ui';
import { formatRupees, formatValue, fillTemplate, type Computed } from './logic/calc';
import { glossaryById } from './logic/content';
import type { LessonBlock } from './logic/types';
import { Markup } from './Markup';
import { ExploreWidget } from './widgets/ExploreWidget';

type Ctx = Record<string, Computed>;

const LABELS: Partial<Record<LessonBlock['type'], { key: string; tone: string }>> = {
  note: { key: 'investui.card.note', tone: 'bg-slate-50' },
  tradeoff: { key: 'investui.card.tradeoff', tone: 'bg-sky-50' },
  misconception: { key: 'investui.card.mistake', tone: 'bg-amber-50' },
  formula: { key: 'investui.card.formula', tone: 'bg-slate-100' },
  explore: { key: 'investui.card.explore', tone: 'bg-teal-50' },
  predict: { key: 'investui.card.predict', tone: 'bg-sky-50' },
  steps: { key: 'investui.card.steps', tone: 'bg-white' },
  jargon: { key: 'investui.card.words', tone: 'bg-white' },
};

export function BlockCard({ block, ctx, onPredictDone }: { block: LessonBlock; ctx: Ctx; onPredictDone: () => void }) {
  const tx = (key: string) => fillTemplate(t(key), ctx);
  const label = LABELS[block.type];

  return (
    <section className={`space-y-3 rounded-2xl border border-slate-200 p-5 shadow-sm ${label?.tone ?? 'bg-white'}`}>
      {label && <h2 className="text-xs font-bold uppercase tracking-wide text-teal-800">{t(label.key)}</h2>}

      {block.textKey && block.type !== 'formula' && (
        <p className={block.type === 'hook' ? 'text-xl font-semibold text-slate-900' : 'text-lg leading-relaxed text-slate-800'}>
          <Markup text={tx(block.textKey)} />
        </p>
      )}
      {block.type === 'formula' && block.textKey && (
        <p className="font-mono text-base leading-relaxed text-slate-800">
          <Markup text={tx(block.textKey)} />
        </p>
      )}

      {block.type === 'steps' && <Steps keys={block.stepKeys ?? []} tx={tx} />}

      {block.type === 'explore' && block.explore && (
        <div className="space-y-4">
          <p className="text-lg text-slate-800">{tx(block.explore.promptKey)}</p>
          <ExploreWidget widget={block.explore.widget} params={resolveParams(block.explore.params, ctx)} />
        </div>
      )}

      {block.type === 'predict' && block.predict && block.predict.input.kind === 'slider' && (
        <PredictCard predict={block.predict} input={block.predict.input} ctx={ctx} tx={tx} onDone={onPredictDone} />
      )}

      {block.type === 'jargon' && (
        <dl className="space-y-2">
          {(block.terms ?? []).map((id) => {
            const g = glossaryById.get(id);
            if (!g) return null;
            return (
              <div key={id} className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold text-slate-900">{t(g.termKey)}</dt>
                <dd className="text-slate-700">{t(g.defKey)}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}

function resolveParams(params: Record<string, string>, ctx: Ctx): Record<string, number> {
  return Object.fromEntries(Object.entries(params).map(([name, ref]) => [name, ctx[ref.slice(1)]?.raw ?? 0]));
}

/** Worked example, one line per tap, so nobody faces a wall of numbers. */
function Steps({ keys, tx }: { keys: string[]; tx: (key: string) => string }) {
  const [shown, setShown] = useState(1);
  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {keys.slice(0, shown).map((key, i) => (
          <li key={key} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-lg">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
              {i + 1}
            </span>
            <span className="pt-0.5">
              <Markup text={tx(key)} />
            </span>
          </li>
        ))}
      </ol>
      {shown < keys.length && (
        <Button variant="secondary" className="w-full" onClick={() => setShown(shown + 1)}>
          {t('investui.btn.showStep')}
        </Button>
      )}
    </div>
  );
}

function PredictCard({
  predict,
  input,
  ctx,
  tx,
  onDone,
}: {
  predict: NonNullable<LessonBlock['predict']>;
  input: Extract<NonNullable<LessonBlock['predict']>['input'], { kind: 'slider' }>;
  ctx: Ctx;
  tx: (key: string) => string;
  onDone: () => void;
}) {
  const raw = (id?: string) => (id ? ctx[id]?.raw : undefined);
  const format = (n: number) =>
    input.unit === 'rupees' ? formatRupees(n) : input.unit === 'percent' ? formatValue(n, 'percent') : String(Math.round(n * 100) / 100);

  return (
    <Predict
      question={tx(predict.questionKey)}
      slider={{ min: input.min, max: input.max, step: input.step }}
      actual={raw(predict.reveal.actual) ?? 0}
      {...(raw(predict.reveal.rangeLow) !== undefined ? { low: raw(predict.reveal.rangeLow)! } : {})}
      {...(raw(predict.reveal.rangeHigh) !== undefined ? { high: raw(predict.reveal.rangeHigh)! } : {})}
      format={format}
      explanation={tx(predict.reveal.explainKey)}
      onDone={onDone}
    />
  );
}
