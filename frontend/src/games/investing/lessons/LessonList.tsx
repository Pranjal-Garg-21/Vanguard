/** Investing ABC: the list of lessons. Route: /learn/invest. Owner: P4. */
import { Link } from 'react-router';
import { t } from '@/platform';
import { Badge, Card, SimBanner } from '@/ui';
import { fillTemplate, runCalcs } from './logic/calc';
import { lessons } from './logic/content';

export function LessonList() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <SimBanner />
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold text-slate-900">{t('investui.list.title')}</h1>
        <p className="text-slate-600">{t('investui.list.subtitle')}</p>
      </header>

      <ul className="space-y-3">
        {lessons.map((lesson) => {
          const ctx = runCalcs(lesson.vars, lesson.calcs);
          return (
            <li key={lesson.id}>
              <Link to={`/learn/invest/${lesson.id}`} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
                <Card className="flex items-center gap-4 transition-colors hover:bg-teal-50">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xl font-extrabold text-white" aria-hidden="true">
                    {lesson.order}
                  </span>
                  <span className="flex-1">
                    <span className="block text-lg font-bold text-slate-900">{fillTemplate(t(lesson.titleKey), ctx)}</span>
                    <span className="block text-sm text-slate-600">{fillTemplate(t(lesson.blurbKey), ctx)}</span>
                  </span>
                  <Badge tone="info">{t('investui.list.minutes', { n: lesson.estMinutes })}</Badge>
                </Card>
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
