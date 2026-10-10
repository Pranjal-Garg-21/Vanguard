/**
 * Investing, Gambling or Scam?: twelve offers, one at a time. Sort each into a bucket, then see the signs that give it away.
 * Use case UC-SAFE-09 · Owner: P4 · Route: /learn/invest/invest-or-scam
 *
 * Stands in for the shared Triage verb until P3's lands: three big buttons instead of a swipe, so it works with a keyboard
 * and a screen reader. No real names are used anywhere; a hyped coin is explained as speculation, not as a sure scam.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { InvestShell } from '@/games/investing/lessons/InvestShell';
import { runCalcs } from '@/games/investing/lessons/logic/calc';
import type { RoomQuestion } from '@/games/investing/lessons/logic/types';
import { QuestionFlow } from '@/games/investing/lessons/QuestionFlow';
import { useQuestionRunner } from '@/games/investing/lessons/useQuestionRunner';
import { logEvent, t } from '@/platform';
import { Button, Card, ChevronIcon, ProgressBar, Spinner } from '@/ui';
import { useGameSave } from '../shared/gameSave';
import raw from '@/content/scenarios/invest/invest_or_scam.json';
import { parseScamSave, type ScamSave } from './logic/save';
import { isCorrect, misconceptionFor, order, summarise, type Bucket, type ScamConfig } from './logic/sort';

const config = raw as unknown as ScamConfig & { check: { vars: Parameters<typeof runCalcs>[0]; calcs: Parameters<typeof runCalcs>[1]; questions: RoomQuestion[] } };
const BUCKET_STYLE: Record<Bucket, string> = {
  investing: 'border-brand/60 hover:bg-brand/10',
  gambling: 'border-warn/60 hover:bg-warn/10',
  scam: 'border-bad/60 hover:bg-bad/10',
};

/** Loads your last score (if any) so the start screen can show it, then plays. */
export function InvestOrScam({ seed = 'invest-or-scam' }: { seed?: number | string }) {
  const { loaded, saved, save } = useGameSave('invest-or-scam', parseScamSave);
  if (!loaded) {
    return (
      <InvestShell>
        <Spinner />
      </InvestShell>
    );
  }
  return <InvestOrScamGame seed={seed} last={saved.state} onSave={save} />;
}

function InvestOrScamGame({ seed, last, onSave }: { seed: number | string; last: ScamSave | null; onSave: (state: ScamSave | null, done?: boolean) => void }) {
  const [phase, setPhase] = useState<'intro' | 'sort' | 'done'>('intro');
  const [round, setRound] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Bucket>>({});
  const ids = useMemo(() => order(config.cards.map((c) => c.id), `${seed}-${round}`), [seed, round]);
  const [index, setIndex] = useState(0);

  const card = config.cards.find((c) => c.id === ids[index])!;
  const given = answers[card.id];
  const summary = summarise(config, answers);

  const checkCtx = useMemo(() => runCalcs(config.check.vars, config.check.calcs), []);
  const runner = useQuestionRunner('invest_or_scam', checkCtx);
  const earned = config.check.questions.reduce((s, q) => s + runner.earnedFor(q), 0);
  const total = config.check.questions.reduce((s, q) => s + q.points, 0);

  const choose = (bucket: Bucket) => {
    if (given) return;
    setAnswers((a) => ({ ...a, [card.id]: bucket }));
    const misconception = misconceptionFor(card, bucket);
    void logEvent({
      mode: 'arcade',
      activity: 'invest_or_scam',
      concept: 'red_flags',
      choice: `sort_${card.id}_${bucket}`,
      level: 2,
      correct: isCorrect(card, bucket),
      ...(misconception ? { misconception } : {}),
    });
  };

  const next = () => {
    if (index + 1 >= ids.length) {
      const final = summarise(config, answers);
      onSave({ correct: final.correct, total: final.total }, true);
      setPhase('done');
    } else {
      setIndex(index + 1);
    }
    window.scrollTo({ top: 0 });
  };

  const again = () => {
    setAnswers({});
    setIndex(0);
    setRound((r) => r + 1);
    runner.reset();
    setPhase('sort');
    window.scrollTo({ top: 0 });
  };

  return (
    <InvestShell>
      <Link to="/learn/invest" className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-brand">
        <ChevronIcon dir="left" />
        {t('scamsort.back')}
      </Link>

      {phase === 'intro' && (
        <Card className="space-y-4">
          <h1 className="text-2xl font-bold">{t('scamsort.title')}</h1>
          <p className="text-lg text-ink-soft">{t('scamsort.subtitle')}</p>
          <h2 className="font-bold">{t('scamsort.intro.title')}</h2>
          <ul className="space-y-2 text-ink">
            {config.buckets.map((b) => (
              <li key={b} className="rounded-lg bg-surface-2 p-3">
                {t(`scamsort.intro.${b}`)}
              </li>
            ))}
          </ul>
          {last && <p className="rounded-lg bg-surface-2 p-3 text-ink-soft">{t('scamsort.intro.last', { right: last.correct, total: last.total })}</p>}
          <Button size="lg" onClick={() => setPhase('sort')}>
            {t('scamsort.intro.start')}
          </Button>
        </Card>
      )}

      {phase === 'sort' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('scamsort.card.of', { n: index + 1, total: ids.length })}</p>
            <ProgressBar value={index / ids.length} />
          </div>

          <Card className="coach-in space-y-4" key={card.id}>
            <p className="text-2xl leading-snug text-ink">{t(`scamsort.card.${card.id}.text`)}</p>
            <h2 className="text-sm font-bold text-ink-soft">{t('scamsort.card.ask')}</h2>
            <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label={t('scamsort.card.ask')}>
              {config.buckets.map((b) => {
                const picked = given === b;
                const right = given && b === card.answer;
                return (
                  <button
                    key={b}
                    type="button"
                    disabled={!!given}
                    onClick={() => choose(b)}
                    className={`min-h-14 rounded-xl border-2 px-4 py-3 text-lg font-bold text-ink transition-colors disabled:cursor-default ${BUCKET_STYLE[b]} ${
                      right ? 'bg-brand/15' : picked ? 'bg-surface-3 opacity-80' : ''
                    }`}
                  >
                    {t(`scamsort.bucket.${b}`)}
                  </button>
                );
              })}
            </div>

            {given && (
              <div className="coach-in space-y-3" aria-live="polite">
                <p className={`rounded-lg border-l-4 p-3 text-lg font-bold ${isCorrect(card, given) ? 'border-brand bg-brand/10 text-ink' : 'border-warn bg-warn/10 text-ink'}`}>
                  {isCorrect(card, given)
                    ? t('scamsort.reveal.right', { bucket: t(`scamsort.bucket.${card.answer}`) })
                    : t('scamsort.reveal.wrong', { bucket: t(`scamsort.bucket.${card.answer}`) })}
                </p>
                <p className="text-ink">{t(`scamsort.card.${card.id}.why`)}</p>
                <div>
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">{t('scamsort.reveal.signs')}</h3>
                  <ul className="flex flex-wrap gap-2">
                    {card.tells.map((tell) => {
                      const flag = config.tellKinds[tell] === 'flag';
                      return (
                        <li key={tell} className={`rounded-lg border px-3 py-1 text-sm ${flag ? 'border-bad/60 text-ink' : 'border-brand/60 text-ink'}`}>
                          <span className="font-bold">{flag ? t('scamsort.reveal.flag') : t('scamsort.reveal.good')}: </span>
                          {t(`scamsort.tell.${tell}`)}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <Button size="lg" onClick={next}>
                  {index + 1 >= ids.length ? t('scamsort.card.finish') : t('scamsort.card.next')}
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-4">
          <Card className="space-y-3">
            <h1 className="text-2xl font-bold">{t('scamsort.done.title')}</h1>
            <p className="text-xl text-ink">{t('scamsort.done.score', { right: summary.correct, total: summary.total })}</p>
            <ul className="space-y-1 text-ink-soft">
              {config.buckets.map((b) => (
                <li key={b}>{t('scamsort.done.bucket', { bucket: t(`scamsort.bucket.${b}`), right: summary.byBucket[b].correct, total: summary.byBucket[b].total })}</li>
              ))}
            </ul>
            {summary.missedFlags.length === 0 ? (
              <p className="rounded-lg bg-surface-2 p-3 text-ink">{t('scamsort.done.perfect')}</p>
            ) : (
              <div className="rounded-lg bg-surface-2 p-3">
                <p className="font-bold text-ink">{t('scamsort.done.missed')}</p>
                <ul className="mt-1 list-disc space-y-0.5 ps-5 text-ink-soft">
                  {summary.missedFlags.slice(0, 3).map((f) => (
                    <li key={f}>{t(`scamsort.tell.${f}`)}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-bold">{t('scamsort.check.title')}</h2>
              <span className="text-sm font-bold text-muted">{t('investui.room.pointsEarned', { earned, total })}</span>
            </div>
            <QuestionFlow
              questions={config.check.questions}
              ctx={checkCtx}
              h={{ stateOf: runner.stateOf, isDone: runner.isDone, submitNumber: runner.submitNumber, pickOption: runner.pickOption, toggleHint: runner.toggleHint, reveal: runner.reveal }}
            />
          </section>

          <Button size="lg" variant="secondary" onClick={again}>
            {t('scamsort.again')}
          </Button>
        </div>
      )}
    </InvestShell>
  );
}
