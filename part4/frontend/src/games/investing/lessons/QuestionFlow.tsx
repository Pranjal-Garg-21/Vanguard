/**
 * Shows a task's questions one at a time: finished ones shrink to a single line (open one to read it again),
 * the current one is in full, and the ones still to come stay hidden behind a count.
 */
import { t } from '@/platform';
import { CheckIcon } from '@/ui';
import { fillTemplate, type Computed } from './logic/calc';
import type { QuestionState } from './logic/room';
import type { RoomQuestion } from './logic/types';
import { QuestionRow } from './RoomQuestions';

export interface FlowHandlers {
  stateOf: (q: RoomQuestion) => QuestionState;
  isDone: (q: RoomQuestion) => boolean;
  submitNumber: (q: RoomQuestion, value: string) => void;
  pickOption: (q: RoomQuestion, optionId: string) => void;
  toggleHint: (q: RoomQuestion) => void;
  reveal: (q: RoomQuestion) => void;
}

export function QuestionFlow({ questions, ctx, h }: { questions: RoomQuestion[]; ctx: Record<string, Computed>; h: FlowHandlers }) {
  const current = questions.findIndex((q) => !h.isDone(q));
  const row = (q: RoomQuestion) => (
    <QuestionRow
      q={q}
      ctx={ctx}
      state={h.stateOf(q)}
      onSubmitNumber={(v) => h.submitNumber(q, v)}
      onPickOption={(id) => h.pickOption(q, id)}
      onHint={() => h.toggleHint(q)}
      onReveal={() => h.reveal(q)}
    />
  );

  return (
    <div className="space-y-3">
      {questions.map((q, i) => {
        if (i === current) {
          return (
            <div key={q.id} className="coach-in space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{t('investui.room.questionOf', { n: i + 1, total: questions.length })}</p>
              {row(q)}
            </div>
          );
        }
        if (i < current || current === -1) {
          return (
            <details key={q.id} className="rounded-xl border border-brand/40 bg-brand/5">
              <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-bold text-ink">
                <CheckIcon className="h-4 w-4 shrink-0 text-brand" />
                <span className="line-clamp-1">{fillTemplate(t(q.promptKey), ctx)}</span>
              </summary>
              <div className="p-3 pt-0">{row(q)}</div>
            </details>
          );
        }
        return null;
      })}
      {current !== -1 && current < questions.length - 1 && (
        <p className="text-sm text-muted">{t('investui.room.moreQuestions', { n: questions.length - 1 - current })}</p>
      )}
    </div>
  );
}
