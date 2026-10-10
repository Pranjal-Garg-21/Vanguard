/** Investing ABC: the list of lessons and rooms. Route: /learn/invest. Owner: P4. */
import { Link } from 'react-router';
import { t } from '@/platform';
import type { ReactNode } from 'react';
import { Badge, Card, SimBanner } from '@/ui';
import { fillTemplate, runCalcs } from './logic/calc';
import { allLessons } from './logic/content';
import { roomPoints } from './logic/room';

export function LessonList() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <SimBanner />
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold text-slate-900">{t('investui.list.title')}</h1>
        <p className="text-slate-600">{t('investui.list.subtitle')}</p>
      </header>

      <ul className="space-y-3">
        {allLessons.map((lesson) => {
          const ctx = runCalcs(lesson.vars, lesson.calcs);
          const isRoom = lesson.kind === 'room';
          return (
            <li key={lesson.id}>
              <Link
                to={`/learn/invest/${lesson.id}`}
                className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                <Row isRoom={isRoom}>
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-extrabold text-white ${isRoom ? 'bg-emerald-500' : 'bg-teal-700'}`}
                    aria-hidden="true"
                  >
                    {lesson.order}
                  </span>
                  <span className="flex-1">
                    {isRoom && <span className="block text-xs font-bold tracking-widest text-emerald-400">{t('investui.list.room').toUpperCase()}</span>}
                    <span className={`block text-lg font-bold ${isRoom ? 'text-white' : 'text-slate-900'}`}>{fillTemplate(t(lesson.titleKey), ctx)}</span>
                    <span className={`block text-sm ${isRoom ? 'text-slate-300' : 'text-slate-600'}`}>{fillTemplate(t(lesson.blurbKey), ctx)}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <Badge tone="info">{t('investui.list.minutes', { n: lesson.estMinutes })}</Badge>
                    {lesson.kind === 'room' && <Badge tone="good">{t('investui.list.points', { n: roomPoints(lesson) })}</Badge>}
                  </span>
                </Row>
              </Link>
            </li>
          );
        })}
      </ul>

      <Link to="/dev" className="block text-center text-sm text-teal-800 underline">
        {t('investui.list.back')}
      </Link>
    </main>
  );
}

/** Rooms get a dark row (like a TryHackMe room card); card lessons keep the standard white Card. */
function Row({ isRoom, children }: { isRoom: boolean; children: ReactNode }) {
  if (!isRoom) return <Card className="flex items-center gap-4 transition-colors hover:bg-teal-50">{children}</Card>;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm transition-colors hover:bg-slate-800">
      {children}
    </div>
  );
}
