/**
 * The scenario questions at the end of a lesson. A wrong answer that exposes a named misconception
 * shows that specific mistake first, then the general "why". Answers are logged (IDs only, no text).
 */
import { useMemo, useState } from 'react';
import { logEvent, t } from '@/platform';
import { Button, CheckIcon } from '@/ui';
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
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('investui.check.title')}</h2>
        <span className="text-xs text-muted">{t('investui.check.question', { n: index + 1, total: items.length })}</span>
      </div>

      <p className="text-lg font-bold text-ink">
        <Markup text={tx(item.stemKey)} />
      </p>

      <ul className="space-y-2">
        {options.map((option) => {
          const isPicked = picked?.id === option.id;
          const isRight = option.id === item.correct;
          const tone = !picked
            ? 'border-line-strong bg-surface-2 hover:border-brand'
            : isRight
              ? 'border-brand bg-brand/10'
              : isPicked
                ? 'border-warn bg-warn/10'
                : 'border-line bg-surface-2 opacity-60';
          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={picked !== null}
                onClick={() => pick(option)}
                className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-start text-base text-ink transition-colors ${tone}`}
              >
                <span>{tx(option.textKey)}</span>
                {picked && isRight && <CheckIcon className="h-5 w-5 text-brand" />}
              </button>
            </li>
          );
        })}
      </ul>

      {picked && (
        <div className={`space-y-2 rounded-lg border-l-4 bg-surface-2 p-4 ${wasRight ? 'border-brand' : 'border-warn'}`} aria-live="polite">
          <p className={`font-bold ${wasRight ? 'text-brand' : 'text-warn'}`}>
            {wasRight ? t('investui.check.right') : t('investui.check.wrong')}
          </p>
          {!wasRight && picked.feedbackKey && <p className="font-bold text-ink">{tx(picked.feedbackKey)}</p>}
          <p className="text-ink-soft">{tx(item.whyKey)}</p>
          <Button size="lg" className="mt-2 w-full sm:w-auto" onClick={next}>
            {index + 1 < items.length ? t('investui.btn.nextQuestion') : t('investui.btn.seeResults')}
          </Button>
        </div>
      )}
    </div>
  );
}