/**
 * First-run questions that find the student's starting point: what they
 * know, where they are and what they want. Saves the result as the
 * "baseline" setting and logs one event per knowledge question.
 */
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { loadActiveProfile, logEvent, setSetting, t, useActiveProfile } from '@/platform';
import { Button, Card, Icon, ProgressBar, Spinner } from '@/ui';
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
    <div className="min-h-dvh bg-bg text-ink">
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-6 md:max-w-2xl md:px-8">
        {result ? (
          <Done result={result} name={profile.displayName} onGo={() => navigate(next, { replace: true })} />
        ) : !question ? (
          <Card className="mt-10 space-y-4 p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand/15 text-brand">
              <Icon name="target" className="h-6 w-6" />
            </span>
            <h1 className="text-3xl font-bold">{t('baseline.intro.title')}</h1>
            <p className="text-lg text-ink-soft">{t('baseline.intro.body')}</p>
            <Button size="lg" className="w-full" onClick={() => setIndex(0)}>
              {t('baseline.intro.start')}
            </Button>
          </Card>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-bold text-ink-soft">
                <span>{t(`baseline.sections.${question.section}`)}</span>
                <span>{t('baseline.nav.step', { current: index + 1, total })}</span>
              </div>
              <ProgressBar value={(index + 1) / total} />
            </div>

            <Card className="space-y-2 p-5">
              {question.hasBody && <p className="mb-3 rounded-lg bg-surface-2 p-3 text-lg">{t(`baseline.q.${question.id}.body`)}</p>}
              <h1 className="text-2xl font-bold">{t(`baseline.q.${question.id}.title`)}</h1>
              {question.kind === 'multi' && <p className="text-sm text-muted">{t('baseline.nav.multiHint')}</p>}
            </Card>

            <div className="grid gap-3 md:grid-cols-2" role={question.kind === 'multi' ? 'group' : 'radiogroup'}>
              {question.options.map((option) => {
                const a = answers[question.id];
                const selected = Array.isArray(a) ? a.includes(option.id) : a === option.id;
                return (
                  <Choice
                    key={option.id}
                    label={t(`baseline.q.${question.id}.options.${option.id}`)}
                    selected={selected}
                    multi={question.kind === 'multi'}
                    onClick={() => pick(question, option.id)}
                  />
                );
              })}
              {question.knowledge && <Choice label={t('baseline.notSure')} selected={answers[question.id] === NOT_SURE} onClick={() => pick(question, NOT_SURE)} />}
            </div>

            <div className="mt-auto flex items-center gap-3 pt-2">
              <Button variant="secondary" size="lg" disabled={saving} onClick={() => setIndex(index - 1)} aria-label={t('baseline.nav.back')}>
                <Icon name="arrowLeft" className="h-5 w-5" />
              </Button>
              {!question.knowledge && (
                <Button variant="ghost" size="lg" disabled={saving} onClick={() => void advance(true)}>
                  {t('baseline.nav.skip')}
                </Button>
              )}
              <Button size="lg" className="flex-1" disabled={!isAnswered(question) || saving} onClick={() => void advance()}>
                {index === total - 1 ? t('baseline.nav.finish') : t('baseline.nav.next')}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/** One selectable answer: a large target with a clear selected state. */
function Choice({ label, selected, onClick, multi = false }: { label: string; selected: boolean; onClick: () => void; multi?: boolean }) {
  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      onClick={onClick}
      className={`flex min-h-16 w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-start text-lg font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
        selected ? 'border-brand bg-brand/15 text-ink' : 'border-line-strong bg-surface text-ink hover:border-brand'
      }`}
    >
      <span className="flex-1">{label}</span>
      {selected && <Icon name="check" className="h-6 w-6 text-brand" />}
    </button>
  );
}

function Done({ result, name, onGo }: { result: BaselineResult; name: string; onGo: () => void }) {
  return (
    <Card className="mt-10 space-y-4 p-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand/15 text-brand">
        <Icon name="sprout" className="h-6 w-6" />
      </span>
      <h1 className="text-3xl font-bold">{t('baseline.done.title', { name })}</h1>
      <p className="text-lg text-ink-soft">{t(`baseline.done.level.${result.level}`)}</p>
      <dl className="space-y-2 text-lg">
        {result.goal && (
          <div className="rounded-lg bg-surface-2 p-3">
            <dt className="text-sm font-bold text-muted">{t('baseline.done.goalLabel')}</dt>
            <dd>{t(`baseline.q.goal.options.${result.goal}`)}</dd>
          </div>
        )}
        {result.focus && (
          <div className="rounded-lg bg-surface-2 p-3">
            <dt className="text-sm font-bold text-muted">{t('baseline.done.focusLabel')}</dt>
            <dd>{t(`baseline.q.focus.options.${result.focus}`)}</dd>
          </div>
        )}
      </dl>
      <Button size="lg" className="w-full" onClick={onGo}>
        {t('baseline.done.go')}
      </Button>
    </Card>
  );
}
