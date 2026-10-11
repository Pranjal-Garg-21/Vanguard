/**
 * One topic section's lessons (Banking, Planning, Saving or Borrowing). Route: /learn/:pillar. Owner: P4.
 * Investing has its own page (LessonList) because it also holds the games.
 */
import { Link, useParams } from 'react-router';
import { t } from '@/platform';
import { ChevronIcon } from '@/ui';
import { InvestShell } from './InvestShell';
import { LessonGrid } from './LessonGrid';
import { roomsFor } from './logic/content';
import { PILLARS, type Pillar } from './logic/types';
import { useRoomSummaries } from './useSavedProgress';

export function PillarLessons() {
  const { pillar = '' } = useParams();
  const known = (PILLARS as readonly string[]).includes(pillar);
  const lessons = known ? roomsFor(pillar as Pillar) : [];
  const summaries = useRoomSummaries(lessons);
  const upNext = summaries ? lessons.find((r) => summaries[r.id]?.status !== 'done') : lessons[0];

  if (!known) {
    return (
      <InvestShell hub>
        <p>{t('learn.notFound')}</p>
        <Link to="/learn" className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-brand">
          <ChevronIcon dir="left" />
          {t('learn.all')}
        </Link>
      </InvestShell>
    );
  }

  return (
    <InvestShell wide pillar={pillar as Pillar}>
      <header className="space-y-1 pb-1">
        <h1 className="text-2xl font-bold">{t(`learn.pillar.${pillar}.name`)}</h1>
        <p className="max-w-3xl text-ink-soft">{t(`learn.pillar.${pillar}.blurb`)}</p>
      </header>
      {lessons.length === 0 ? <p className="text-ink-soft">{t('learn.empty')}</p> : <LessonGrid lessons={lessons} summaries={summaries ?? undefined} upNextId={upNext?.id} />}
    </InvestShell>
  );
}
