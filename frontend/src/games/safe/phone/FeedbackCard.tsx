/** Shows whether an answer was correct, why, and whether a better option existed. */
import { t } from '@/platform';
import type { Feedback, ResponseFeedback } from './logic/feedback';
import { AudioButton, Icon } from '@/ui';

type Tone = { box: string; icon: 'check' | 'x' | 'alert' | 'search'; text: string };

const TONES: Record<string, Tone> = {
  good: { box: 'border-emerald-500 bg-emerald-500/10', icon: 'check', text: 'text-emerald-700' },
  better: { box: 'border-amber-500 bg-amber-500/10', icon: 'alert', text: 'text-amber-700' },
  wrong: { box: 'border-bad bg-bad/10', icon: 'x', text: 'text-bad' },
  info: { box: 'border-phone-link bg-phone-link/10', icon: 'search', text: 'text-phone-link' },
};

const cheerIndex = (text: string) => [...text].reduce((h, c) => (h + c.charCodeAt(0)) % 4, 0);

export function FeedbackCard({ feedback, yours, bestLabel, vars, tone: palette = 'phone' }: { feedback: Feedback | ResponseFeedback; yours: string; bestLabel?: string; vars?: Record<string, string | number>; tone?: 'phone' | 'dark' }) {
  const kind = feedback.grade === 'exact' || feedback.grade === 'best' ? 'good' : feedback.grade === 'wrong' ? 'wrong' : feedback.grade === 'info' ? 'info' : 'better';
  const tone = TONES[kind] as Tone;
  const title = t(`safe.fb.title.${feedback.grade}`);
  const ink = palette === 'phone' ? 'text-phone-ink' : 'text-ink';
  const soft = palette === 'phone' ? 'text-phone-muted' : 'text-muted';
  // The reason is the lesson, so it is the part worth hearing.
  const spoken = [`safe.fb.title.${feedback.grade}`, ...(feedback.noteKey ? [feedback.noteKey] : []), ...(feedback.explainKey ? [feedback.explainKey] : [])];
  return (
    <div className={`rounded-lg border-s-4 p-3 text-sm ${tone.box}`} role="status">
      <p className={`flex items-center gap-1.5 font-bold ${tone.text}`}>
        <span className={kind === 'good' ? 'animate-star inline-flex' : 'inline-flex'}><Icon name={tone.icon} className="h-4 w-4" /></span>
        {title}
        <AudioButton keys={spoken} vars={vars} className="-my-2 ms-auto h-9 w-9" />
      </p>
      {kind === 'good' && <p className={`mt-0.5 text-sm font-semibold ${tone.text}`}>{t(`safe.fb.cheer.${cheerIndex(yours)}`)}</p>}
      <p className={`mt-1 ${ink}`}>
        <span className={soft}>{t('safe.fb.yours')}: </span>
        <strong>{yours}</strong>
        {feedback.best && bestLabel && (
          <>
            <span className={soft}> · {t('safe.fb.best')}: </span>
            <strong>{bestLabel}</strong>
          </>
        )}
      </p>
      {feedback.noteKey && <p className={`mt-1.5 ${ink}`}>{t(feedback.noteKey, vars)}</p>}
      {feedback.explainKey && (
        <p className={`mt-1.5 ${soft}`}>
          <span className="font-bold">{t('safe.fb.why')}: </span>
          {t(feedback.explainKey, vars)}
        </p>
      )}
    </div>
  );
}
