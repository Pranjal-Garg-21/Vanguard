import { useState } from 'react';
import { t } from '@/platform';
import { Button, Card, Notice, ProgressBar } from '@/ui';

export type QuizQuestion = {
  id: string;
  concept: string;
  promptKey: string;
  whyKey: string;
  options: { id: string; textKey: string; correct: boolean }[];
};
export type QuizAnswer = { id: string; concept: string; correct: boolean; choice: string };

/** Short multiple-choice check. Shows the reason after every answer. */
export function Quiz({ questions, onFinish }: { questions: QuizQuestion[]; onFinish: (answers: QuizAnswer[]) => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const q = questions[i];
  if (!q) return null;
  const last = i === questions.length - 1;

  const choose = (optionId: string) => {
    if (picked) return;
    setPicked(optionId);
    const opt = q.options.find((o) => o.id === optionId);
    setAnswers((a) => [...a, { id: q.id, concept: q.concept, correct: !!opt?.correct, choice: optionId }]);
  };
  const next = () => {
    if (last) return onFinish(answers);
    setI(i + 1);
    setPicked(null);
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4 pt-10">
      <div>
        <p className="font-mono text-xs text-muted">{t('safe.upi.check.of', { n: i + 1, total: questions.length })}</p>
        <ProgressBar className="mt-2" value={(i + (picked ? 1 : 0)) / questions.length} />
      </div>
      <Card className="space-y-4">
        <h1 className="text-xl font-bold text-ink">{t(q.promptKey)}</h1>
        <div className="space-y-2">
          {q.options.map((o) => {
            const state = !picked ? '' : o.correct ? 'border-brand bg-brand/10' : picked === o.id ? 'border-bad bg-bad/10' : 'opacity-60';
            return (
              <button key={o.id} type="button" disabled={!!picked} onClick={() => choose(o.id)} className={`w-full rounded-lg border border-line-strong bg-surface-2 p-3 text-start text-ink transition enabled:hover:border-brand ${state}`}>
                {t(o.textKey)}
              </button>
            );
          })}
        </div>
        {picked && <Notice tone={q.options.find((o) => o.id === picked)?.correct ? 'info' : 'bad'}>{t(q.whyKey)}</Notice>}
      </Card>
      {picked && <Button size="lg" className="w-full" onClick={next}>{last ? t('safe.upi.check.finish') : t('safe.upi.check.next')}</Button>}
    </div>
  );
}
