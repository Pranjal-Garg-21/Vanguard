/**
 * Every topic section in one place (Banking, Planning, Saving, Borrowing, Investing), then the investing lessons themselves.
 * Stay Safe is practised under Simulations, not taught here. Route: /learn. Owner: P4.
 */
import { Link } from 'react-router';
import { t } from '@/platform';
import { Badge, Card, ProgressBar, SectionLabel } from '@/ui';
import { InvestShell } from './InvestShell';
import { useState } from 'react';
import { LessonGrid } from './LessonGrid';
import { LessonPath } from './LessonPath';
import { roomsFor, rooms } from './logic/content';
import { PILLARS } from './logic/types';
import { useRoomSummaries } from './useSavedProgress';

const SECTIONS = PILLARS.map((p) => ({ id: p, lessons: roomsFor(p) }));
const ALL = SECTIONS.flatMap((s) => s.lessons);

export function LearnHub() {
  const [view, setView] = useState<'path' | 'grid'>('path');
  const summaries = useRoomSummaries(ALL);
  return (
    <InvestShell wide hub>
      <header className="space-y-1 pb-1">
        <h1 className="text-2xl font-bold">{t('learn.title')}</h1>
        <p className="max-w-3xl text-ink-soft">{t('learn.subtitle')}</p>
      </header>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ id, lessons }) => {
          const done = lessons.filter((l) => summaries?.[l.id]?.status === 'done').length;
          return (
            <li key={id}>
              <Link to={`/learn/${id}`} className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                <Card className="flex h-full flex-col gap-3 transition-colors hover:border-brand">
                  <h2 className="text-lg font-bold">{t(`learn.pillar.${id}.name`)}</h2>
                  <p className="flex-1 text-sm text-ink-soft">{t(`learn.pillar.${id}.blurb`)}</p>
                  {lessons.length > 0 ? (
                    <div className="space-y-1">
                      <ProgressBar value={done / lessons.length} />
                      <p className="text-xs font-bold text-muted">{t('learn.count', { done, total: lessons.length })}</p>
                    </div>
                  ) : (
                    <Badge>{t('learn.soon')}</Badge>
                  )}
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      <section className="space-y-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>{t('learn.lessonsTitle', { n: rooms.length })}</SectionLabel>
          <div className="inline-flex rounded-lg border border-line-strong p-0.5" role="group" aria-label={t('learn.view')}>
            {(['path', 'grid'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-xs font-bold transition ${view === v ? 'bg-brand text-brand-ink' : 'text-ink-soft hover:text-ink'}`}
              >
                {t(`learn.view_${v}`)}
              </button>
            ))}
          </div>
        </div>
        {(() => {
          const upNextId = summaries ? rooms.find((r) => summaries[r.id]?.status !== 'done')?.id : rooms[0]?.id;
          return view === 'path' ? (
            <LessonPath lessons={rooms} summaries={summaries ?? undefined} upNextId={upNextId} />
          ) : (
            <LessonGrid lessons={rooms} summaries={summaries ?? undefined} upNextId={upNextId} />
          );
        })()}
      </section>
    </InvestShell>
  );
}
