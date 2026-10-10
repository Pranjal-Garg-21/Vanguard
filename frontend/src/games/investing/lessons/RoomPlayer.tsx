/**
 * Plays one Investing ABC room. Laptop layout: a sticky panel on the left (title, progress, task list) and the
 * active task on the right, with the reading and lab beside the questions on wide screens. One column on phones.
 * Route: /learn/invest/:lessonId. Owner: P4.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { logEvent, t } from '@/platform';
import { Button, CheckIcon, ChevronIcon } from '@/ui';
import { InvestShell } from './InvestShell';
import { BlockCard } from './LessonCards';
import { fillTemplate, runCalcs } from './logic/calc';
import { allLessons } from './logic/content';
import { checkNumberAnswer, emptyQuestionState, roomPoints, roomQuestions, type QuestionState } from './logic/room';
import type { Room, RoomQuestion } from './logic/types';
import { QuestionRow } from './RoomQuestions';

const LEVEL = 2;

export function RoomPlayer({ room }: { room: Room }) {
  const ctx = useMemo(() => runCalcs(room.vars, room.calcs), [room]);
  const tx = (key: string) => fillTemplate(t(key), ctx);
  const questions = useMemo(() => roomQuestions(room), [room]);
  const totalPoints = roomPoints(room);

  const [answers, setAnswers] = useState<Record<string, QuestionState>>({});
  const [active, setActive] = useState(0);

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
        <aside className="space-y-4 lg:sticky lg:top-6">
          <Link to="/learn/invest" className="inline-flex items-center gap-1 text-sm font-medium text-teal-800 hover:underline">
            <ChevronIcon dir="left" />
            {t('investui.room.all')}
          </Link>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-teal-700">{t('investui.room.label')}</div>
              <h1 className="mt-1 text-2xl font-extrabold leading-tight text-slate-900">{tx(room.titleKey)}</h1>
              <p className="mt-2 text-sm text-slate-600">{tx(room.blurbKey)}</p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
              <Chip>{t(`investui.room.difficulty.${room.difficulty}`)}</Chip>
              <Chip>{t('investui.room.minutes', { n: room.estMinutes })}</Chip>
              <Chip>{t('investui.list.points', { n: totalPoints })}</Chip>
            </div>

            <div>
              <div
                className="h-2 w-full rounded-full bg-slate-200"
                role="progressbar"
                aria-label={t('investui.room.progress', { done: tasksDone, total: room.tasks.length })}
                aria-valuenow={tasksDone}
                aria-valuemin={0}
                aria-valuemax={room.tasks.length}
              >
                <div className="h-2 rounded-full bg-teal-600 transition-all" style={{ width: `${(tasksDone / room.tasks.length) * 100}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-slate-600">
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
                          isActive ? 'border-teal-600 bg-teal-50' : 'border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            done ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {done ? <CheckIcon className="h-4 w-4" /> : i + 1}
                        </span>
                        <span className="hidden flex-1 text-sm font-semibold text-slate-900 lg:block">{tx(x.titleKey)}</span>
                        <span className="hidden text-xs text-slate-500 lg:block">
                          {solved}/{x.questions.length}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        </aside>

        {/* Right: the active task */}
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              {t('investui.room.task', { n: active + 1 })} / {room.tasks.length}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 lg:text-3xl">{tx(task.titleKey)}</h2>

            <div className="mt-6 grid gap-8 xl:grid-cols-2">
              <div className="space-y-4">
                {task.blocks.map((block, i) => (
                  <BlockCard key={`${task.id}-${i}`} block={block} ctx={ctx} onPredictDone={() => undefined} />
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">{t('investui.room.answerBelow')}</h3>
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

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <Button variant="secondary" disabled={active === 0} onClick={() => go(active - 1)}>
                {t('investui.room.prevTask')}
              </Button>
              {active < room.tasks.length - 1 && (
                <Button variant={taskDone(active) ? 'primary' : 'secondary'} onClick={() => go(active + 1)}>
                  {t('investui.room.nextTask')}
                </Button>
              )}
            </div>
          </div>

          {roomDone && (
            <div className="space-y-3 rounded-2xl border border-teal-200 bg-white p-6 text-center shadow-sm">
              <h2 className="text-2xl font-extrabold text-slate-900">{t('investui.room.complete.title')}</h2>
              <p className="text-lg text-slate-700">{t('investui.room.complete.body', { earned, total: totalPoints })}</p>
              {earned < totalPoints && <p className="text-sm text-slate-600">{t('investui.room.complete.skipped')}</p>}
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
            </div>
          )}
        </section>
      </div>
    </InvestShell>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-2.5 py-1">{children}</span>;
}
