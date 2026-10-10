/**
 * The scenario questions at the end of a lesson. A wrong answer that exposes a named misconception
 * shows that specific mistake first, then the general "why". Answers are logged (IDs only, no text).
 */
import { useMemo, useState } from 'react';
import { logEvent, t } from '@/platform';
import { Button } from '@/ui';
import { fillTemplate, runCalcs } from './logic/calc';
import { shuffleStable } from './logic/shuffle';
import type { CheckItem, CheckOption, Level } from './logic/types';
import { Markup } from './Markup';

export function CheckQuiz({
  lessonId,
  items,
  level,
  onDone,
}: {
  lessonId: string;
  items: CheckItem[];
  level: Level;
  onDone: (right: number, total: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<CheckOption | null>(null);
  const [right, setRight] = useState(0);

  const item = items[index]!;
  const ctx = useMemo(() => runCalcs(item.vars, item.calcs), [item]);
  const options = useMemo(() => shuffleStable(item.options, item.id), [item]);
  const tx = (key: string) => fillTemplate(t(key), ctx);

  const pick = (option: CheckOption) => {
    if (picked) return;
    const correct = option.id === item.correct;
    setPicked(option);
    if (correct) setRight((r) => r + 1);
    void logEvent({
      mode: 'arcade',
      activity: lessonId,
      concept: item.concept,
      choice: option.id,
      correct,
      level,
      ...(option.misconception ? { misconception: option.misconception } : {}),
    });
  };

  const next = () => {
    if (index + 1 < items.length) {
      setIndex(index + 1);
      setPicked(null);
    } else {
      onDone(right, items.length);
    }
  };

  const wasRight = picked?.id === item.correct;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-800">{t('investui.check.title')}</h2>
        <span className="text-xs text-slate-500">{t('investui.check.question', { n: index + 1, total: items.length })}</span>
      </div>

      <p className="text-lg font-semibold text-slate-900">
        <Markup text={tx(item.stemKey)} />
      </p>

      <ul className="space-y-2">
        {options.map((option) => {
          const isPicked = picked?.id === option.id;
          const isRight = option.id === item.correct;
          const tone = !picked
            ? 'border-slate-300 bg-white hover:bg-slate-50'
            : isRight
              ? 'border-emerald-500 bg-emerald-50'
              : isPicked
                ? 'border-amber-500 bg-amber-50'
                : 'border-slate-200 bg-white opacity-60';
          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={picked !== null}
                onClick={() => pick(option)}
                className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-start text-base transition-colors ${tone}`}
              >
                <span>{tx(option.textKey)}</span>
                {picked && isRight && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {picked && (
        <div className="space-y-2 rounded-2xl bg-slate-50 p-4" aria-live="polite">
          <p className={`font-bold ${wasRight ? 'text-emerald-700' : 'text-amber-700'}`}>
            {wasRight ? t('investui.check.right') : t('investui.check.wrong')}
          </p>
          {!wasRight && picked.feedbackKey && <p className="font-medium text-slate-900">{tx(picked.feedbackKey)}</p>}
          <p className="text-slate-700">{tx(item.whyKey)}</p>
          <Button size="lg" className="mt-2 w-full" onClick={next}>
            {index + 1 < items.length ? t('investui.btn.nextQuestion') : t('investui.btn.seeResults')}
          </Button>
        </div>
      )}
    </div>
  );
}
