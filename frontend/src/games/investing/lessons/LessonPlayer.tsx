/**
 * Plays one Investing ABC lesson. Every lesson is a room (TryHackMe-style), so this finds the
 * room and hands it to RoomLoader. Route: /learn/:pillar/:lessonId (and /learn/invest/:lessonId). Owner: P4.
 */
import { Link, useParams } from 'react-router';
import { t } from '@/platform';
import { ChevronIcon } from '@/ui';
import { InvestShell } from './InvestShell';
import { lessonById } from './logic/content';
import { RoomLoader } from './RoomLoader';

export function LessonPlayer() {
  const { lessonId = '' } = useParams();
  const room = lessonById.get(lessonId);
  if (!room) {
    return (
      <InvestShell>
        <p>{t('learn.lessonNotFound')}</p>
        <Link to="/learn" className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-brand">
          <ChevronIcon dir="left" />
          {t('learn.all')}
        </Link>
      </InvestShell>
    );
  }
  return <RoomLoader key={room.id} room={room} />;
}
