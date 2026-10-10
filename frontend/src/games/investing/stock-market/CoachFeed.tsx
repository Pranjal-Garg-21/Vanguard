/**
 * The coach: after each move, what it did to your money and something to think about.
 * Wide screens: a box under "Your money". Phones: a dock at the bottom that opens to the full message.
 */
import { useState } from 'react';
import { t } from '@/platform';
import { Card } from '@/ui';
import type { Comment } from './logic/coach';

/** All the comments from one move (a trade, or the turn of a week). */
export interface Turn {
  id: number;
  round: number;
  comments: Comment[];
}

const EDGE: Record<Comment['tone'], string> = { good: 'border-l-brand', warn: 'border-l-warn', info: 'border-l-info' };

function Line({ c }: { c: Comment }) {
  return (
    <li className={`rounded-lg border-l-4 bg-surface-2 p-3 ${EDGE[c.tone]}`}>
      <div className="mb-0.5 text-xs font-bold uppercase tracking-[0.12em] text-muted">
        {c.kind === 'think' ? t('stockmarket.coach.think') : t('stockmarket.coach.happened')}
      </div>
      <p className="text-ink">{t(`stockmarket.coach.${c.key}`, c.vars)}</p>
    </li>
  );
}

/** The two comments worth reading first: the first thing that happened, and the most important thing to think about. */
export function leadComments(comments: Comment[]): { lead: Comment[]; rest: Comment[] } {
  const first = comments[0];
  if (!first) return { lead: [], rest: [] };
  const others = comments.slice(1);
  const second = others.find((c) => c.tone === 'warn') ?? others.find((c) => c.kind === 'think') ?? others[0];
  const lead = second ? [first, second] : [first];
  return { lead, rest: comments.filter((c) => !lead.includes(c)) };
}

export function CoachFeed({ turns }: { turns: Turn[] }) {
  const [latest, ...earlier] = turns;
  const { lead, rest } = leadComments(latest?.comments ?? []);
  return (
    <Card className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('stockmarket.coach.title')}</h2>
      {!latest ? (
        <p className="text-ink-soft">{t('stockmarket.coach.empty')}</p>
      ) : (
        <div key={latest.id} className="coach-in space-y-2">
          <ul aria-live="polite" className="space-y-2">
            {lead.map((c, i) => (
              <Line key={i} c={c} />
            ))}
          </ul>
          {rest.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-bold text-info">{t('stockmarket.coach.moreAbout')}</summary>
              <ul className="mt-2 space-y-2">
                {rest.map((c, i) => (
                  <Line key={i} c={c} />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {earlier.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-bold text-info">{t('stockmarket.coach.more')}</summary>
          <div className="mt-2 space-y-3">
            {earlier.map((turn) => (
              <div key={turn.id} className="space-y-1">
                <div className="text-xs font-bold text-muted">{t('stockmarket.coach.week', { n: turn.round })}</div>
                <ul className="space-y-1">
                  {turn.comments.map((c, i) => (
                    <li key={i} className={`border-l-4 ps-2 text-ink-soft ${EDGE[c.tone]}`}>
                      {t(`stockmarket.coach.${c.key}`, c.vars)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}
    </Card>
  );
}

/** Phone only: the newest comments pinned to the bottom, so a tap on "Buy" far down the page still shows its effect. */
export function CoachDock({ turn }: { turn: Turn | undefined }) {
  const [open, setOpen] = useState(false);
  if (!turn) return null;
  const first = turn.comments[0]!;
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line-strong bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.35)] lg:hidden">
      <div className="mx-auto max-w-3xl space-y-2 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{t('stockmarket.coach.title')}</span>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-h-11 px-2 text-sm font-bold text-info">
            {open ? t('stockmarket.coach.hide') : t('stockmarket.coach.show')}
          </button>
        </div>
        {open ? (
          <ul key={turn.id} className="max-h-[50vh] space-y-2 overflow-y-auto">
            {leadComments(turn.comments).lead.map((c, i) => (
              <Line key={i} c={c} />
            ))}
          </ul>
        ) : (
          <p className="line-clamp-2 text-sm text-ink">{t(`stockmarket.coach.${first.key}`, first.vars)}</p>
        )}
      </div>
    </div>
  );
}
