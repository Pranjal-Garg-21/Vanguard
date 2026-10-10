/**
 * Verb component: predict. Guess first, then reveal. The gap is the lesson.
 * Owner: P4
 *
 * The student drags a slider and must lock in before seeing the answer. The reveal puts the guess
 * and the model's answer on one line with the honest range shaded. Over- and under-estimates look
 * the same: no red, no "wrong".
 */
import { useState } from 'react';
import { t } from '@/platform';
import { Button } from '@/ui';

export interface PredictResult {
  guess: number;
  actual: number;
  /** (guess - actual) / actual. Positive = guessed too high. */
  gapPct: number;
  /** True when the guess falls inside the revealed range (or equals the exact answer). */
  inRange: boolean;
  /** Milliseconds from first render to lock-in. */
  ms: number;
}

export interface PredictProps {
  question: string;
  slider: { min: number; max: number; step: number };
  /** The model's answer. */
  actual: number;
  /** Honest range around it. Omit (or pass equal values) when the answer is exact. */
  low?: number;
  high?: number;
  /** Turns a number into text, e.g. rupees or percent. */
  format: (n: number) => string;
  /** Shown after the reveal. */
  explanation: string;
  /** Called once, at lock-in. */
  onDone?: (result: PredictResult) => void;
}

const pct = (n: number, min: number, max: number) => Math.min(100, Math.max(0, ((n - min) / (max - min)) * 100));

export function Predict({ question, slider, actual, low, high, format, explanation, onDone }: PredictProps) {
  const [guess, setGuess] = useState(() => roundToStep((slider.min + slider.max) / 2, slider));
  const [locked, setLocked] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const lo = low ?? actual;
  const hi = high ?? actual;
  const exact = lo === hi;

  const lockIn = () => {
    setLocked(true);
    onDone?.({
      guess,
      actual,
      gapPct: actual === 0 ? 0 : (guess - actual) / actual,
      inRange: exact ? Math.abs(guess - actual) <= slider.step / 2 : guess >= lo && guess <= hi,
      ms: Date.now() - startedAt,
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-slate-900">{question}</p>

      <div>
        <div className="mb-1 flex justify-between text-sm text-slate-500">
          <span>{format(slider.min)}</span>
          <span className="text-lg font-bold text-teal-800">{format(guess)}</span>
          <span>{format(slider.max)}</span>
        </div>
        <input
          type="range"
          className="h-3 w-full cursor-pointer accent-teal-700 disabled:opacity-60"
          min={slider.min}
          max={slider.max}
          step={slider.step}
          value={guess}
          disabled={locked}
          onChange={(e) => setGuess(Number(e.target.value))}
          aria-label={question}
        />
      </div>

      {!locked && (
        <Button size="lg" className="w-full" onClick={lockIn}>
          {t('investui.btn.lockIn')}
        </Button>
      )}

      {locked && (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4" aria-live="polite">
          <div className="relative h-14" aria-hidden="true">
            <div className="absolute inset-x-0 top-6 h-2 rounded-full bg-slate-200" />
            {!exact && (
              <div
                className="absolute top-6 h-2 rounded-full bg-teal-300"
                style={{
                  insetInlineStart: `${pct(lo, slider.min, slider.max)}%`,
                  width: `${pct(hi, slider.min, slider.max) - pct(lo, slider.min, slider.max)}%`,
                }}
              />
            )}
            <Marker at={pct(guess, slider.min, slider.max)} label={t('investui.predict.yourGuess')} tone="guess" />
            <Marker at={pct(actual, slider.min, slider.max)} label={t('investui.predict.model')} tone="model" below />
          </div>

          <dl className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-white p-2">
              <dt className="text-xs text-slate-500">{t('investui.predict.yourGuess')}</dt>
              <dd className="text-lg font-bold text-indigo-700">{format(guess)}</dd>
            </div>
            <div className="rounded-xl bg-white p-2">
              <dt className="text-xs text-slate-500">{t('investui.predict.model')}</dt>
              <dd className="text-lg font-bold text-teal-800">{format(actual)}</dd>
            </div>
          </dl>

          <p className="text-sm text-slate-600">
            {exact ? t('investui.predict.exact') : t('investui.predict.range', { low: format(lo), high: format(hi) })}
          </p>
          <p className="text-slate-800">{explanation}</p>
        </div>
      )}
    </div>
  );
}

function Marker({ at, label, tone, below = false }: { at: number; label: string; tone: 'guess' | 'model'; below?: boolean }) {
  const colour = tone === 'guess' ? 'bg-indigo-600' : 'bg-teal-700';
  return (
    <div className="absolute top-0 -translate-x-1/2 text-center" style={{ insetInlineStart: `${at}%` }} title={label}>
      <div className={`mx-auto mt-4 h-6 w-6 rounded-full border-2 border-white shadow ${colour} ${below ? 'translate-y-1' : ''}`} />
    </div>
  );
}

function roundToStep(value: number, slider: { min: number; step: number }) {
  return slider.min + Math.round((value - slider.min) / slider.step) * slider.step;
}
