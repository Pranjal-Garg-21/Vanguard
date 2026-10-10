/**
 * Plays one Investing ABC lesson: intro (pick a depth) -> cards -> check questions -> summary.
 * Route: /learn/invest/:lessonId. Owner: P4.
 */
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { t } from '@/platform';
import { Button, Card, SimBanner } from '@/ui';
import { CheckQuiz } from './CheckQuiz';
import { BlockCard } from './LessonCards';
import { fillTemplate, runCalcs } from './logic/calc';
import { allLessons, checkById, lessonById } from './logic/content';
import type { Lesson, LessonBlock, Level } from './logic/types';
import { RoomPlayer } from './RoomPlayer';

type Page = { kind: 'block'; block: LessonBlock } | { kind: 'check' } | { kind: 'summary' };

export function LessonPlayer() {
  const { lessonId = '' } = useParams();
  const lesson = lessonById.get(lessonId);
  if (lesson?.kind === 'room') return <RoomPlayer key={lesson.id} room={lesson} />;
  if (!lesson) {
    return (
      <Shell>
        <p>Lesson not found.</p>
        <Link className="text-teal-800 underline" to="/learn/invest">
          {t('investui.btn.backToLessons')}
        </Link>
      </Shell>
    );
  }
  return <LessonRun key={lesson.id} lesson={lesson} />;
}

function Shell({ children, progress }: { children: React.ReactNode; progress?: number }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <SimBanner />
      {progress !== undefined && (
        <div className="h-2 w-full rounded-full bg-slate-200" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 rounded-full bg-teal-700 transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      {children}
    </main>
  );
}

function LessonRun({ lesson }: { lesson: Lesson }) {
  const [level, setLevel] = useState<Level | null>(null);
  const [page, setPage] = useState(0);
  const [predicted, setPredicted] = useState<Set<number>>(new Set());
  const [score, setScore] = useState<{ right: number; total: number } | null>(null);

  const ctx = useMemo(() => runCalcs(lesson.vars, lesson.calcs), [lesson]);
  const tx = (key: string) => fillTemplate(t(key), ctx);

  const pages = useMemo<Page[]>(() => {
    if (level === null) return [];
    const visible = lesson.blocks.filter((b) => (b.minLevel ?? 1) <= level);
    const cards = visible.filter((b) => b.type !== 'jargon');
    const jargon = visible.filter((b) => b.type === 'jargon');
    return [...[...cards, ...jargon].map((block) => ({ kind: 'block', block }) as Page), { kind: 'check' }, { kind: 'summary' }];
  }, [lesson, level]);

  const restart = () => {
    setLevel(null);
    setPage(0);
    setPredicted(new Set());
    setScore(null);
  };

  // ---------- intro ----------
  if (level === null) {
    return (
      <Shell>
        <Link to="/learn/invest" className="text-sm text-teal-800 underline">
          ← {t('investui.list.title')}
        </Link>
        <Card className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900">{tx(lesson.titleKey)}</h1>
          <p className="text-slate-700">{tx(lesson.blurbKey)}</p>
          <p className="text-sm text-slate-500">{t('investui.list.minutes', { n: lesson.estMinutes })}</p>
        </Card>
        <h2 className="font-semibold text-slate-900">{t('investui.intro.depth')}</h2>
        <div className="grid gap-2">
          {([1, 2, 3] as Level[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className="flex min-h-16 items-center justify-between rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-start transition-colors hover:border-teal-600 hover:bg-teal-50"
            >
              <span>
                <span className="block text-lg font-bold">{t(`investui.level.${l}`)}</span>
                <span className="block text-sm text-slate-600">{t(`investui.level.${l}.hint`)}</span>
              </span>
              <span aria-hidden="true" className="text-2xl text-teal-700">→</span>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  const current = pages[page]!;
  const progress = page / (pages.length - 1);

  // ---------- check ----------
  if (current.kind === 'check') {
    const items = lesson.check.map((id) => checkById.get(id)!).filter((c) => c.level <= level + 1);
    return (
      <Shell progress={progress}>
        <CheckQuiz
          lessonId={lesson.id}
          items={items}
          level={level}
          onDone={(right, total) => {
            setScore({ right, total });
            setPage(page + 1);
          }}
        />
      </Shell>
    );
  }

  // ---------- summary ----------
  if (current.kind === 'summary') {
    const next = allLessons.find((l) => l.order === lesson.order + 1);
    const good = score !== null && score.right >= Math.ceil(score.total * 0.7);
    return (
      <Shell progress={1}>
        <Card className="space-y-3 text-center">
          <div className="text-5xl" aria-hidden="true">{good ? '🎉' : '💪'}</div>
          <h1 className="text-2xl font-extrabold">{t('investui.summary.title')}</h1>
          {score && <p className="text-lg">{t('investui.summary.score', { right: score.right, total: score.total })}</p>}
          <p className="text-slate-700">{good ? t('investui.summary.good') : t('investui.summary.more')}</p>
        </Card>
        {next && (
          <Link className="block" to={`/learn/invest/${next.id}`}>
            <Button size="lg" className="w-full">{tx(next.titleKey)} →</Button>
          </Link>
        )}
        <Button variant="secondary" className="w-full" onClick={restart}>{t('investui.btn.again')}</Button>
        <Link className="block text-center text-teal-800 underline" to="/learn/invest">{t('investui.btn.backToLessons')}</Link>
      </Shell>
    );
  }

  // ---------- a card ----------
  const needsGuess = current.block.type === 'predict' && !predicted.has(page);
  const upNext = pages[page + 1];
  return (
    <Shell progress={progress}>
      <BlockCard
        key={`${level}-${page}`}
        block={current.block}
        ctx={ctx}
        onPredictDone={() => setPredicted((s) => new Set(s).add(page))}
      />
      <div className="sticky bottom-0 mt-auto flex gap-3 bg-white/90 py-3 backdrop-blur">
        <Button variant="secondary" className="flex-1" disabled={page === 0} onClick={() => setPage(page - 1)}>
          {t('investui.btn.back')}
        </Button>
        <Button size="lg" className="flex-[2]" disabled={needsGuess} onClick={() => setPage(page + 1)}>
          {upNext?.kind === 'check' ? t('investui.btn.startCheck') : t('investui.btn.next')}
        </Button>
      </div>
    </Shell>
  );
}
