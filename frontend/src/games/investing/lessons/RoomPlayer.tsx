/**
 * Plays one Investing ABC room (TryHackMe style): a dark header with progress and points, then numbered tasks.
 * Each task is a little teaching followed by "answer the questions below". Route: /learn/invest/:lessonId.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { logEvent, t } from '@/platform';
import { Button, Card, SimBanner } from '@/ui';
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
  const [open, setOpen] = useState<Set<string>>(() => new Set([room.tasks[0]?.id ?? '']));

  const stateOf = (q: RoomQuestion) => answers[q.id] ?? emptyQuestionState();
  const isDone = (q: RoomQuestion) => stateOf(q).solved || stateOf(q).revealed;
  const taskDone = (taskId: string) => room.tasks.find((x) => x.id === taskId)!.questions.every(isDone);
  const tasksDone = room.tasks.filter((x) => taskDone(x.id)).length;
  const earned = questions.reduce((sum, q) => sum + (stateOf(q).solved && !stateOf(q).revealed ? q.points : 0), 0);
  const roomDone = tasksDone === room.tasks.length;
  const next = allLessons.find((l) => l.order === room.order + 1);

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

  /** After a question is solved, open the next task when this one is finished. */
  const afterSolve = (q: RoomQuestion, taskIndex: number) => {
    const task = room.tasks[taskIndex]!;
    const othersDone = task.questions.filter((x) => x.id !== q.id).every(isDone);
    if (othersDone && room.tasks[taskIndex + 1]) {
      setOpen((s) => new Set(s).add(room.tasks[taskIndex + 1]!.id));
    }
  };

  const submitNumber = (q: RoomQuestion, taskIndex: number, value: string) => {
    const result = checkNumberAnswer(value, ctx[q.answer ?? '']?.raw ?? NaN, q.unit, q.tolerance);
    if (result === 'invalid') return update(q, (s) => ({ ...s, invalid: true }));
    log(q, `${q.id}_typed`, result === 'correct');
    if (result === 'correct') {
      update(q, (s) => ({ ...s, solved: true, invalid: false }));
      afterSolve(q, taskIndex);
    } else {
      update(q, (s) => ({ ...s, wrong: s.wrong + 1, invalid: false }));
    }
  };

  const pickOption = (q: RoomQuestion, taskIndex: number, optionId: string) => {
    const option = q.options?.find((o) => o.id === optionId);
    if (!option) return;
    const correct = optionId === q.correct;
    log(q, `${q.id}_${optionId}`, correct, option.misconception);
    if (correct) {
      update(q, (s) => ({ ...s, solved: true }));
      afterSolve(q, taskIndex);
    } else {
      update(q, (s) => ({
        ...s,
        wrong: s.wrong + 1,
        wrongOptions: [...s.wrongOptions, optionId],
        ...(option.feedbackKey ? { lastFeedbackKey: option.feedbackKey } : {}),
      }));
    }
  };

  const toggleHint = (q: RoomQuestion) => {
    if (!stateOf(q).hintShown) log(q, `${q.id}_hint`);
    update(q, (s) => ({ ...s, hintShown: !s.hintShown }));
  };

  const reveal = (q: RoomQuestion, taskIndex: number) => {
    log(q, `${q.id}_reveal`, false);
    update(q, (s) => ({ ...s, revealed: true }));
    afterSolve(q, taskIndex);
  };

  const restart = () => {
    setAnswers({});
    setOpen(new Set([room.tasks[0]?.id ?? '']));
    window.scrollTo({ top: 0 });
  };

  return (
    <main className="mx-auto max-w-md space-y-4 p-4 pb-16">
      <SimBanner />
      <Link to="/learn/invest" className="text-sm text-teal-800 underline">
        ← {t('investui.room.all')}
      </Link>

      <header className="space-y-3 rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
        <div className="text-xs font-bold tracking-widest text-emerald-400">{t('investui.room.label')}</div>
        <h1 className="text-2xl font-extrabold leading-tight">{tx(room.titleKey)}</h1>
        <p className="text-slate-300">{tx(room.blurbKey)}</p>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <Chip>{t(`investui.room.difficulty.${room.difficulty}`)}</Chip>
          <Chip>{t('investui.room.minutes', { n: room.estMinutes })}</Chip>
          <Chip>{t('investui.list.points', { n: totalPoints })}</Chip>
        </div>
        <div>
          <div
            className="h-2.5 w-full rounded-full bg-slate-700"
            role="progressbar"
            aria-valuenow={tasksDone}
            aria-valuemin={0}
            aria-valuemax={room.tasks.length}
          >
            <div className="h-2.5 rounded-full bg-emerald-400 transition-all" style={{ width: `${(tasksDone / room.tasks.length) * 100}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-300">
            <span>{t('investui.room.progress', { done: tasksDone, total: room.tasks.length })}</span>
            <span>{t('investui.room.pointsEarned', { earned, total: totalPoints })}</span>
          </div>
        </div>
      </header>

      {room.tasks.map((task, index) => {
        const isOpen = open.has(task.id);
        const done = taskDone(task.id);
        const solvedCount = task.questions.filter(isDone).length;
        return (
          <section key={task.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() =>
                setOpen((s) => {
                  const copy = new Set(s);
                  if (copy.has(task.id)) copy.delete(task.id);
                  else copy.add(task.id);
                  return copy;
                })
              }
              className="flex w-full items-center gap-3 p-4 text-start"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-extrabold ${done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                aria-hidden="true"
              >
                {done ? '✓' : index + 1}
              </span>
              <span className="flex-1">
                <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">{t('investui.room.task', { n: index + 1 })}</span>
                <span className="block text-lg font-bold text-slate-900">{tx(task.titleKey)}</span>
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {solvedCount}/{task.questions.length}
              </span>
              <span aria-hidden="true" className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>

            {isOpen && (
              <div className="space-y-4 border-t border-slate-100 p-4">
                {task.blocks.map((block, i) => (
                  <BlockCard key={i} block={block} ctx={ctx} onPredictDone={() => undefined} />
                ))}
                <h3 className="pt-2 text-sm font-bold uppercase tracking-wide text-teal-800">{t('investui.room.answerBelow')}</h3>
                {task.questions.map((q) => (
                  <QuestionRow
                    key={q.id}
                    q={q}
                    ctx={ctx}
                    state={stateOf(q)}
                    onSubmitNumber={(v) => submitNumber(q, index, v)}
                    onPickOption={(id) => pickOption(q, index, id)}
                    onHint={() => toggleHint(q)}
                    onReveal={() => reveal(q, index)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {roomDone && (
        <Card className="space-y-3 border-emerald-300 bg-emerald-50 text-center">
          <div className="text-5xl" aria-hidden="true">🏆</div>
          <h2 className="text-2xl font-extrabold text-emerald-900">{t('investui.room.complete.title')}</h2>
          <p className="text-lg text-emerald-900">{t('investui.room.complete.body', { earned, total: totalPoints })}</p>
          {earned < totalPoints && <p className="text-sm text-emerald-800">{t('investui.room.complete.skipped')}</p>}
          {next && (
            <Link className="block" to={`/learn/invest/${next.id}`}>
              <Button size="lg" className="w-full">
                {t('investui.room.next')}: {tx(next.titleKey)} →
              </Button>
            </Link>
          )}
          <Button variant="secondary" className="w-full" onClick={restart}>
            {t('investui.room.restart')}
          </Button>
        </Card>
      )}
    </main>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-700 px-2.5 py-1 text-slate-100">{children}</span>;
}
