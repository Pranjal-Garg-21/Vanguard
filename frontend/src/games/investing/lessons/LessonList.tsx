/** Investing ABC: the list of lessons and rooms. Route: /learn/invest. Owner: P4. */
import { Link } from 'react-router';
import { t } from '@/platform';
import { Badge, Card, ChevronIcon } from '@/ui';
import { InvestShell } from './InvestShell';
import { fillTemplate, runCalcs } from './logic/calc';
import { allLessons } from './logic/content';
import { roomPoints } from './logic/room';

export function LessonList() {
  return (
    <InvestShell wide>
      <header className="space-y-1 pb-2">
        <h1 className="text-2xl font-bold">{t('investui.list.title')}</h1>
        <p className="text-ink-soft">{t('investui.list.subtitle')}</p>
      </header>

      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allLessons.map((lesson) => {
          const ctx = runCalcs(lesson.vars, lesson.calcs);
          return (
            <li key={lesson.id}>
              <Link
                to={`/learn/invest/${lesson.id}`}
                className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <Card className="flex h-full flex-col gap-3 transition-colors hover:border-brand">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-base font-bold text-brand-ink" aria-hidden="true">
                      {lesson.order}
                    </span>
                    <span className="flex flex-wrap justify-end gap-2">
                      <Badge tone="info">{lesson.kind === 'room' ? t('investui.list.room') : t('investui.list.lesson')}</Badge>
                      <Badge>{t('investui.list.minutes', { n: lesson.estMinutes })}</Badge>
                      {lesson.kind === 'room' && <Badge tone="good">{t('investui.list.points', { n: roomPoints(lesson) })}</Badge>}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold">{fillTemplate(t(lesson.titleKey), ctx)}</h2>
                    <p className="mt-1 text-sm text-ink-soft">{fillTemplate(t(lesson.blurbKey), ctx)}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-brand">
                    {t('investui.list.open')}
                    <ChevronIcon dir="right" />
                  </span>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </InvestShell>
  );
}
