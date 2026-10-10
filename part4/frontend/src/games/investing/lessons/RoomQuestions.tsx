/**
 * Question rows for a room: type a number, or pick an option. Wrong answers say "Not quite" (never a red
 * failure), name the specific mistake when there is one, and can be retried. Hints are free.
 */
import { useMemo, useState } from 'react';
import { t } from '@/platform';
import { AudioButton, Button, CheckIcon, ChevronIcon } from '@/ui';
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
  const won = state.solved && !state.revealed;

  return (
    <div className={`space-y-3 rounded-xl border p-4 ${done ? 'border-brand/50 bg-brand/5' : 'border-line bg-surface'}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-bold text-ink">
          <Markup text={tx(q.promptKey)} />
        </p>
        <AudioButton text={tx(q.promptKey).replace(/\*\*/g, '')} />
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${won ? 'bg-brand text-brand-ink' : 'bg-surface-3 text-ink-soft'}`}>
          {won ? t('investui.room.won', { n: q.points }) : t('investui.list.points', { n: q.points })}
        </span>
      </div>

      {q.kind === 'number' ? <NumberInput {...props} /> : <ChoiceList {...props} tx={tx} />}

      {!done && q.hintKey && (
        <div>
          <button type="button" onClick={props.onHint} className="inline-flex items-center gap-1 text-sm font-bold text-info hover:underline">
            {state.hintShown ? t('investui.room.hideHint') : t('investui.room.hint')}
            <ChevronIcon dir={state.hintShown ? 'up' : 'down'} />
          </button>
          {state.hintShown && <p className="mt-2 rounded-lg border-s-4 border-info bg-info/10 p-3 text-ink">{tx(q.hintKey)}</p>}
        </div>
      )}

      {won && (
        <div className="rounded-lg border-s-4 border-brand bg-brand/10 p-3 text-ink" aria-live="polite">
          <p className="flex items-center gap-1.5 font-bold text-brand">
            <CheckIcon />
            {t('investui.room.correct')}
          </p>
          <p>{tx(q.explainKey)}</p>
        </div>
      )}
      {state.revealed && (
        <div className="rounded-lg border-s-4 border-line-strong bg-surface-2 p-3 text-ink" aria-live="polite">
          <p className="font-bold">{t('investui.room.revealed', { answer: answerText(q, ctx, tx) })}</p>
          <p className="text-ink-soft">{tx(q.explainKey)}</p>
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

function NumberInput({ q, state, onSubmitNumber, onReveal }: Props) {
  const [value, setValue] = useState('');
  const done = state.solved || state.revealed;
  const placeholder = t(`investui.room.placeholder.${q.unit ?? 'number'}`);

  return (
    <div className="space-y-2">
      <form
        className="flex flex-wrap gap-2"
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
          className="min-h-11 min-w-40 flex-1 rounded-lg border border-line-strong bg-surface-2 px-3 text-lg focus:border-brand focus:outline-2 focus:outline-brand disabled:opacity-60"
        />
        <Button type="submit" disabled={done || !value.trim()}>
          {t('investui.room.submit')}
        </Button>
      </form>

      {!done && state.invalid && <p className="text-sm text-warn">{t('investui.room.invalid')}</p>}
      {!done && !state.invalid && state.wrong > 0 && (
        <p className="rounded-lg border-s-4 border-warn bg-warn/10 p-3 text-ink" aria-live="polite">
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
          const tone =
            done && isRight
              ? 'border-brand bg-brand/10'
              : wasWrong
                ? 'border-warn bg-warn/10'
                : 'border-line-strong bg-surface-2 hover:border-brand';
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={done || wasWrong}
                onClick={() => onPickOption(o.id)}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-4 py-2 text-start text-ink transition-colors ${tone}`}
              >
                <span>{tx(o.textKey)}</span>
                {done && isRight && <CheckIcon className="h-5 w-5 text-brand" />}
              </button>
            </li>
          );
        })}
      </ul>

      {!done && state.wrong > 0 && (
        <div className="space-y-1 rounded-lg border-s-4 border-warn bg-warn/10 p-3 text-ink" aria-live="polite">
          {state.lastFeedbackKey && <p className="font-bold">{tx(state.lastFeedbackKey)}</p>}
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
