/**
 * The state and handlers behind a set of questions (type a number, pick an option, hints, "show me").
 * Shared by RoomPlayer and the games' check questions, so they behave the same and log the same events.
 */
import { useState } from 'react';
import { logEvent } from '@/platform';
import type { Computed } from './logic/calc';
import { checkNumberAnswer, emptyQuestionState, type QuestionState } from './logic/room';
import type { RoomQuestion } from './logic/types';

const LEVEL = 2;

export function useQuestionRunner(activity: string, ctx: Record<string, Computed>, initial: Record<string, QuestionState> = {}) {
  const [answers, setAnswers] = useState<Record<string, QuestionState>>(initial);

  const stateOf = (q: RoomQuestion) => answers[q.id] ?? emptyQuestionState();
  const isDone = (q: RoomQuestion) => stateOf(q).solved || stateOf(q).revealed;
  const earnedFor = (q: RoomQuestion) => (stateOf(q).solved && !stateOf(q).revealed ? q.points : 0);

  const update = (q: RoomQuestion, change: (s: QuestionState) => QuestionState) =>
    setAnswers((prev) => ({ ...prev, [q.id]: change(prev[q.id] ?? emptyQuestionState()) }));

  const log = (q: RoomQuestion, choice: string, correct?: boolean, misconception?: string) =>
    void logEvent({
      mode: 'arcade',
      activity,
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

  const reset = () => setAnswers({});

  return { answers, stateOf, isDone, earnedFor, submitNumber, pickOption, toggleHint, reveal, reset };
}
