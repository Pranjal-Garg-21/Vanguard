/**
 * Question rows for a room: type a number, or pick an option. Wrong answers say "Not quite" (never a red
 * failure), name the specific mistake when there is one, and can be retried. Hints are free.
 */
import { useMemo, useState } from 'react';
import { t } from '@/platform';
import { Button } from '@/ui';
import { fillTemplate, type Computed } from './logic/calc';
import type { QuestionState } from './logic/room';
import { shuffleStable } from './logic/shuffle';
import type { RoomQuestion } from './logic/types';
import { Markup } from './Markup';

type Ctx = Record<string, Computed>;

interface Props {
  q: RoomQuestion;
  ctx: Ctx;
  state: QuestionState;
  onSubmitNumber: (value: string) => void;
  onPickOption: (optionId: string) => void;
  onHint: () => void;
  onReveal: () => void;
}

export function QuestionRow(props: Props) {
  const { q, ctx, state } = props;
  const tx = (key: string) => fillTemplate(t(key), ctx);
  const done = state.solved || state.revealed;

  return (
    <div className={`space-y-3 rounded-xl border-2 p-4 ${done ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-semibold text-slate-900">
          <Markup text={tx(q.promptKey)} />
        </p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${state.solved && !state.revealed ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
          {state.solved && !state.revealed ? t('investui.room.won', { n: q.points }) : t('investui.list.points', { n: q.points })}
        </span>
      </div>

      {q.kind === 'number' ? <NumberInput {...props} tx={tx} /> : <ChoiceList {...props} tx={tx} />}

      {!done && q.hintKey && (
        <div>
          <button type="button" onClick={props.onHint} className="text-sm font-semibold text-indigo-700 underline">
            💡 {state.hintShown ? t('investui.room.hideHint') : t('investui.room.hint')}
          </button>
          {state.hintShown && <p className="mt-2 rounded-lg bg-indigo-50 p-3 text-indigo-900">{tx(q.hintKey)}</p>}
        </div>
      )}

      {state.solved && !state.revealed && (
        <div className="rounded-lg bg-emerald-100 p-3 text-emerald-900" aria-live="polite">
          <p className="font-bold">✓ {t('investui.room.correct')}</p>
          <p>{tx(q.explainKey)}</p>
        </div>
      )}
      {state.revealed && (
        <div className="rounded-lg bg-slate-100 p-3 text-slate-800" aria-live="polite">
          <p className="font-bold">{t('investui.room.revealed', { answer: answerText(q, ctx, tx) })}</p>
          <p>{tx(q.explainKey)}</p>
        </div>
      )}
    </div>
  );
}

function answerText(q: RoomQuestion, ctx: Ctx, tx: (k: string) => string): string {
  if (q.kind === 'number') return ctx[q.answer ?? '']?.text ?? '';
  const right = q.options?.find((o) => o.id === q.correct);
  return right ? tx(right.textKey) : '';
}

function NumberInput({ q, state, onSubmitNumber, onReveal }: Props & { tx: (k: string) => string }) {
  const [value, setValue] = useState('');
  const done = state.solved || state.revealed;
  const placeholder = t(`investui.room.placeholder.${q.unit ?? 'number'}`);

  return (
    <div className="space-y-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim() && !done) onSubmitNumber(value);
        }}
      >
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          value={value}
          disabled={done}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-slate-300 px-3 text-lg focus:border-teal-600 focus:outline-none disabled:bg-slate-100"
        />
        <Button type="submit" disabled={done || !value.trim()}>
          {t('investui.room.submit')}
        </Button>
      </form>

      {!done && state.invalid && <p className="text-sm text-amber-800">{t('investui.room.invalid')}</p>}
      {!done && !state.invalid && state.wrong > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-amber-900" aria-live="polite">
          {t('investui.room.tryAgain')}
        </p>
      )}
      {!done && state.wrong >= 2 && (
        <Button variant="ghost" onClick={onReveal}>
          {t('investui.room.reveal')}
        </Button>
      )}
    </div>
  );
}

function ChoiceList({ q, state, onPickOption, onReveal, tx }: Props & { tx: (k: string) => string }) {
  const options = useMemo(() => shuffleStable(q.options ?? [], q.id), [q]);
  const done = state.solved || state.revealed;

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {options.map((o) => {
          const isRight = o.id === q.correct;
          const wasWrong = state.wrongOptions.includes(o.id);
          const tone = done && isRight ? 'border-emerald-500 bg-emerald-50' : wasWrong ? 'border-amber-500 bg-amber-50' : 'border-slate-300 bg-white hover:bg-slate-50';
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={done || wasWrong}
                onClick={() => onPickOption(o.id)}
                className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-2 text-start transition-colors ${tone}`}
              >
                <span>{tx(o.textKey)}</span>
                {done && isRight && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {!done && state.wrong > 0 && (
        <div className="space-y-1 rounded-lg bg-amber-50 p-3 text-amber-900" aria-live="polite">
          {state.lastFeedbackKey && <p className="font-semibold">{tx(state.lastFeedbackKey)}</p>}
          <p>{t('investui.room.tryAgain')}</p>
        </div>
      )}
      {!done && state.wrong >= 2 && (
        <Button variant="ghost" onClick={onReveal}>
          {t('investui.room.reveal')}
        </Button>
      )}
    </div>
  );
}
