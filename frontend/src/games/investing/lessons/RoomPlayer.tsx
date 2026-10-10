/**
 * Plays one Investing ABC room. Laptop layout: a sticky panel on the left (title, progress, task list) and the
 * active task on the right, with the reading and lab beside the questions on wide screens. One column on phones.
 * Route: /learn/invest/:lessonId. Owner: P4.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { logEvent, t } from '@/platform';
import { Badge, Button, Card, CheckIcon, ChevronIcon, ProgressBar } from '@/ui';
import { InvestShell } from './InvestShell';
import { BlockCard } from './LessonCards';
import { fillTemplate, runCalcs } from './logic/calc';
import { allLessons } from './logic/content';
import { checkNumberAnswer, emptyQuestionState, roomPoints, roomQuestions, type ProgressMap, type QuestionState } from './logic/room';
import type { Room, RoomQuestion } from './logic/types';
import { QuestionRow } from './RoomQuestions';

const LEVEL = 2;

export function RoomPlayer({ room, initial = {}, onChange }: { room: Room; initial?: ProgressMap; onChange?: (answers: ProgressMap) => void }) {
  const ctx = useMemo(() => runCalcs(room.vars, room.calcs), [room]);
  const tx = (key: string) => fillTemplate(t(key), ctx);
  const questions = useMemo(() => roomQuestions(room), [room]);
  const totalPoints = roomPoints(room);

  const [answers, setAnswers] = useState<Record<string, QuestionState>>(initial);
  // Reopening a room continues at the first task that is not finished yet.
  const [active, setActive] = useState(() => {
    const firstOpen = room.tasks.findIndex((x) => !x.questions.every((q) => initial[q.id]?.solved || initial[q.id]?.revealed));
    return firstOpen === -1 ? 0 : firstOpen;
  });

  // Save after every change, but not for the state we just loaded.
  const loadedOnce = useRef(false);
  useEffect(() => {
    if (!loadedOnce.current) {
      loadedOnce.current = true;
      return;
    }
    onChange?.(answers);
  }, [answers, onChange]);

  const stateOf = (q: RoomQuestion) => answers[q.id] ?? emptyQuestionState();
  const isDone = (q: RoomQuestion) => stateOf(q).solved || stateOf(q).revealed;
  const taskDone = (index: number) => room.tasks[index]!.questions.every(isDone);
  const tasksDone = room.tasks.filter((_, i) => taskDone(i)).length;
  const earned = questions.reduce((sum, q) => sum + (stateOf(q).solved && !stateOf(q).revealed ? q.points : 0), 0);
  const roomDone = tasksDone === room.tasks.length;
  const next = allLessons.find((l) => l.order === room.order + 1);
  const task = room.tasks[active]!;

  const update = (q: RoomQuestion, change: (s: QuestionState) => QuestionState) =>
    setAnswers((prev) => ({ ...prev, [q.id]: change(prev[q.id] ?? emptyQuestionState()) }));

  const log = (q: RoomQuestion, choice: string, correct?: boolean, misconception?: string) =>
    void logEvent({
      mode: 'arcade',
      activity: room.id,
      concept: q.concept,
      choice,
      level: LEVEL,
      ...(correct !== undefined ? { correct } : {}),
      ...(misconception ? { misconception } : {}),
    });

  const submitNumber = (q: RoomQuestion, value: string) => {
    const result = checkNumberAnswer(value, ctx[q.answer ?? '']?.raw ?? NaN, q.unit, q.tolerance);
    if (result === 'invalid') return update(q, (s) => ({ ...s, invalid: true }));
    log(q, `${q.id}_typed`, result === 'correct');
    update(q, (s) => (result === 'correct' ? { ...s, solved: true, invalid: false } : { ...s, wrong: s.wrong + 1, invalid: false }));
  };

  const pickOption = (q: RoomQuestion, optionId: string) => {
    const option = q.options?.find((o) => o.id === optionId);
    if (!option) return;
    const correct = optionId === q.correct;
    log(q, `${q.id}_${optionId}`, correct, option.misconception);
    update(q, (s) =>
      correct
        ? { ...s, solved: true }
        : {
            ...s,
            wrong: s.wrong + 1,
            wrongOptions: [...s.wrongOptions, optionId],
            ...(option.feedbackKey ? { lastFeedbackKey: option.feedbackKey } : {}),
          },
    );
  };

  const toggleHint = (q: RoomQuestion) => {
    if (!stateOf(q).hintShown) log(q, `${q.id}_hint`);
    update(q, (s) => ({ ...s, hintShown: !s.hintShown }));
  };

  const reveal = (q: RoomQuestion) => {
    log(q, `${q.id}_reveal`, false);
    update(q, (s) => ({ ...s, revealed: true }));
  };

  const go = (index: number) => {
    setActive(index);
    window.scrollTo({ top: 0 });
  };

  const restart = () => {
    setAnswers({});
    go(0);
  };

  return (
    <InvestShell wide>
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
        {/* Left: where you are */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          <Link to="/learn/invest" className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-brand">
            <ChevronIcon dir="left" />
            {t('investui.room.all')}
          </Link>

          <Card className="space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('investui.room.label')}</div>
              <h1 className="mt-1 text-2xl font-bold leading-tight">{tx(room.titleKey)}</h1>
              <p className="mt-2 text-sm text-ink-soft">{tx(room.blurbKey)}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge tone="good">{t(`investui.room.difficulty.${room.difficulty}`)}</Badge>
              <Badge>{t('investui.room.minutes', { n: room.estMinutes })}</Badge>
              <Badge>{t('investui.list.points', { n: totalPoints })}</Badge>
            </div>

            <div>
              <ProgressBar value={tasksDone / room.tasks.length} />
              <div className="mt-1.5 flex justify-between text-xs font-bold text-muted">
                <span>{t('investui.room.progress', { done: tasksDone, total: room.tasks.length })}</span>
                <span>{t('investui.room.pointsEarned', { earned, total: totalPoints })}</span>
              </div>
            </div>

            <nav aria-label="Tasks">
              <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible">
                {room.tasks.map((x, i) => {
                  const done = taskDone(i);
                  const isActive = i === active;
                  const solved = x.questions.filter(isDone).length;
                  return (
                    <li key={x.id} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => go(i)}
                        aria-current={isActive ? 'step' : undefined}
                        className={`flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-start transition-colors ${
                          isActive ? 'border-brand bg-surface-2' : 'border-transparent hover:bg-surface-2'
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm font-bold ${
                            done ? 'bg-brand text-brand-ink' : 'bg-surface-3 text-ink-soft'
                          }`}
                        >
                          {done ? <CheckIcon className="h-4 w-4" /> : i + 1}
                        </span>
                        <span className="hidden flex-1 text-sm font-bold text-ink lg:block">{tx(x.titleKey)}</span>
                        <span className="hidden text-xs text-muted lg:block">
                          {solved}/{x.questions.length}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </Card>
        </aside>

        {/* Right: the active task */}
        <section className="space-y-6">
          <Card className="lg:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand">
              {t('investui.room.task', { n: active + 1 })} / {room.tasks.length}
            </p>
            <h2 className="mt-1 text-2xl font-bold lg:text-3xl">{tx(task.titleKey)}</h2>

            <div className="mt-6 grid gap-8 xl:grid-cols-2">
              <div className="space-y-4">
                {task.blocks.map((block, i) => (
                  <BlockCard key={`${task.id}-${i}`} block={block} ctx={ctx} onPredictDone={() => undefined} />
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('investui.room.answerBelow')}</h3>
                {task.questions.map((q) => (
                  <QuestionRow
                    key={q.id}
                    q={q}
                    ctx={ctx}
                    state={stateOf(q)}
                    onSubmitNumber={(v) => submitNumber(q, v)}
                    onPickOption={(id) => pickOption(q, id)}
                    onHint={() => toggleHint(q)}
                    onReveal={() => reveal(q)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
              <Button variant="secondary" disabled={active === 0} onClick={() => go(active - 1)}>
                {t('investui.room.prevTask')}
              </Button>
              {active < room.tasks.length - 1 && (
                <Button variant={taskDone(active) ? 'primary' : 'secondary'} onClick={() => go(active + 1)}>
                  {t('investui.room.nextTask')}
                </Button>
              )}
            </div>
          </Card>

          {roomDone && (
            <Card className="space-y-3 border-brand text-center">
              <h2 className="text-2xl font-bold text-brand">{t('investui.room.complete.title')}</h2>
              <p className="text-lg">{t('investui.room.complete.body', { earned, total: totalPoints })}</p>
              {earned < totalPoints && <p className="text-sm text-ink-soft">{t('investui.room.complete.skipped')}</p>}
              <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
                {next && (
                  <Link to={`/learn/invest/${next.id}`}>
                    <Button size="lg" className="w-full">
                      {t('investui.room.next')}: {tx(next.titleKey)}
                    </Button>
                  </Link>
                )}
                <Button size="lg" variant="secondary" onClick={restart}>
                  {t('investui.room.restart')}
                </Button>
              </div>
            </Card>
          )}
        </section>
      </div>
    </InvestShell>
  );
}