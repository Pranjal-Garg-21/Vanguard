/**
 * First-run questions that find the student's starting point: what they
 * know, where they are and what they want. Saves the result as the
 * "baseline" setting and logs one event per knowledge question.
 */
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { loadActiveProfile, logEvent, setSetting, t, useActiveProfile } from '@/platform';
import { PixelButton, PixelOption, PixelPanel, PixelProgress, Spinner, STRIP_FLOWERS, TileMap, VILLAGE_LEGEND } from '@/ui';
import { BASELINE_QUESTIONS, NOT_SURE, type BaselineQuestion } from './questions';
import { scoreBaseline, type BaselineAnswers, type BaselineResult } from './logic/score';

const EXCLUSIVE = 'none';

export function BaselineFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const next = (location.state as { next?: string } | null)?.next ?? '/';
  const { profile, loaded } = useActiveProfile();

  /** -1 is the intro, then one index per question. */
  const [index, setIndex] = useState(-1);
  const [answers, setAnswers] = useState<BaselineAnswers>({});
  const [result, setResult] = useState<BaselineResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loaded) void loadActiveProfile();
  }, [loaded]);

  if (!loaded) return <Spinner />;
  if (!profile) return <Navigate to="/" replace />;

  const total = BASELINE_QUESTIONS.length;
  const question = index >= 0 ? BASELINE_QUESTIONS[index] : undefined;

  function pick(q: BaselineQuestion, optionId: string) {
    setAnswers((prev) => {
      if (q.kind === 'single') return { ...prev, [q.id]: optionId };
      const current = Array.isArray(prev[q.id]) ? (prev[q.id] as string[]) : [];
      if (optionId === EXCLUSIVE) return { ...prev, [q.id]: current.includes(EXCLUSIVE) ? [] : [EXCLUSIVE] };
      const without = current.filter((x) => x !== EXCLUSIVE && x !== optionId);
      return { ...prev, [q.id]: current.includes(optionId) ? without : [...without, optionId] };
    });
  }

  function isAnswered(q: BaselineQuestion): boolean {
    const a = answers[q.id];
    return Array.isArray(a) ? a.length > 0 : Boolean(a);
  }

  async function finish(finalAnswers: BaselineAnswers) {
    if (!profile) return;
    setSaving(true);
    const scored = scoreBaseline(finalAnswers, BASELINE_QUESTIONS);
    await setSetting(profile.pid, 'baseline', scored);

    // One event per knowledge question, so facilitators can see misconceptions.
    await Promise.all(
      BASELINE_QUESTIONS.filter((q) => q.knowledge).map((q) => {
        const choice = typeof finalAnswers[q.id] === 'string' ? (finalAnswers[q.id] as string) : NOT_SURE;
        const k = q.knowledge!;
        return logEvent({
          mode: 'precheck',
          activity: 'ONB-BASELINE',
          concept: k.concept,
          choice,
          correct: choice === k.correct,
          misconception: k.misconceptions?.[choice] ?? null,
        });
      }),
    );

    setResult(scored);
    setSaving(false);
  }

  async function advance(skip = false) {
    if (!question) return;
    const nextAnswers = { ...answers };
    if (skip) delete nextAnswers[question.id];
    if (index === total - 1) {
      await finish(nextAnswers);
    } else {
      setAnswers(nextAnswers);
      setIndex(index + 1);
    }
  }

  return (
    <div className="min-h-dvh bg-grass">
      <TileMap rows={[STRIP_FLOWERS]} legend={VILLAGE_LEGEND} className="mx-auto max-w-md md:max-w-3xl" />
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-6 text-ink md:max-w-3xl md:px-8">
        {result ? (
          <Done result={result} name={profile.displayName} onGo={() => navigate(next, { replace: true })} />
        ) : !question ? (
          <PixelPanel className="mt-10">
            <p className="text-5xl" aria-hidden="true">
              🧭
            </p>
            <h1 className="mt-3 text-3xl font-bold">{t('baseline.intro.title')}</h1>
            <p className="mt-3 text-lg">{t('baseline.intro.body')}</p>
            <PixelButton className="mt-6 w-full" onClick={() => setIndex(0)}>
              {t('baseline.intro.start')}
            </PixelButton>
          </PixelPanel>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>{t(`baseline.sections.${question.section}`)}</span>
                <span>{t('baseline.nav.step', { current: index + 1, total })}</span>
              </div>
              <PixelProgress current={index + 1} total={total} />
            </div>

            <PixelPanel>
              {question.hasBody && <p className="mb-3 bg-white p-3 text-lg">{t(`baseline.q.${question.id}.body`)}</p>}
              <h1 className="text-2xl font-bold">{t(`baseline.q.${question.id}.title`)}</h1>
              {question.kind === 'multi' && <p className="mt-1 text-sm">{t('baseline.nav.multiHint')}</p>}
            </PixelPanel>

            <div className="grid gap-3 md:grid-cols-2" role={question.kind === 'multi' ? 'group' : 'radiogroup'}>
              {question.options.map((option) => {
                const a = answers[question.id];
                const selected = Array.isArray(a) ? a.includes(option.id) : a === option.id;
                return (
                  <PixelOption
                    key={option.id}
                    emoji={option.emoji}
                    label={t(`baseline.q.${question.id}.options.${option.id}`)}
                    selected={selected}
                    multi={question.kind === 'multi'}
                    onClick={() => pick(question, option.id)}
                  />
                );
              })}
              {question.knowledge && (
                <PixelOption
                  emoji="🤷"
                  label={t('baseline.notSure')}
                  selected={answers[question.id] === NOT_SURE}
                  onClick={() => pick(question, NOT_SURE)}
                />
              )}
            </div>

            <div className="mt-auto flex items-center gap-3 pt-2">
              <PixelButton
                tone="parchment"
                disabled={saving}
                onClick={() => setIndex(index - 1)}
                aria-label={t('baseline.nav.back')}
              >
                ←
              </PixelButton>
              {!question.knowledge && (
                <PixelButton tone="parchment" disabled={saving} onClick={() => void advance(true)}>
                  {t('baseline.nav.skip')}
                </PixelButton>
              )}
              <PixelButton
                tone="grass"
                className="flex-1"
                disabled={!isAnswered(question) || saving}
                onClick={() => void advance()}
              >
                {index === total - 1 ? t('baseline.nav.finish') : t('baseline.nav.next')}
              </PixelButton>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Done({ result, name, onGo }: { result: BaselineResult; name: string; onGo: () => void }) {
  return (
    <PixelPanel className="mt-10">
      <p className="text-5xl" aria-hidden="true">
        🌱
      </p>
      <h1 className="mt-3 text-3xl font-bold">{t('baseline.done.title', { name })}</h1>
      <p className="mt-3 text-lg">{t(`baseline.done.level.${result.level}`)}</p>
      <dl className="mt-4 space-y-2 text-lg">
        {result.goal && (
          <div className="bg-white p-3">
            <dt className="text-sm font-bold">{t('baseline.done.goalLabel')}</dt>
            <dd>{t(`baseline.q.goal.options.${result.goal}`)}</dd>
          </div>
        )}
        {result.focus && (
          <div className="bg-white p-3">
            <dt className="text-sm font-bold">{t('baseline.done.focusLabel')}</dt>
            <dd>{t(`baseline.q.focus.options.${result.focus}`)}</dd>
          </div>
        )}
      </dl>
      <PixelButton tone="grass" className="mt-6 w-full" onClick={onGo}>
        {t('baseline.done.go')}
      </PixelButton>
    </PixelPanel>
  );
}
