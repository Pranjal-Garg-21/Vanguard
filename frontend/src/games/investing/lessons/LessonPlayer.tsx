/**
 * Plays one Investing ABC lesson: intro (pick a depth) -> cards -> check questions -> summary.
 * Rooms (TryHackMe-style) are handed to RoomPlayer. Route: /learn/invest/:lessonId. Owner: P4.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { t } from '@/platform';
import { Button, ChevronIcon } from '@/ui';
import { CheckQuiz } from './CheckQuiz';
import { InvestShell } from './InvestShell';
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
      <InvestShell>
        <p>Lesson not found.</p>
        <BackLink />
      </InvestShell>
    );
  }
  return <LessonRun key={lesson.id} lesson={lesson} />;
}

function BackLink() {
  return (
    <Link to="/learn/invest" className="inline-flex items-center gap-1 text-sm font-medium text-teal-800 hover:underline">
      <ChevronIcon dir="left" />
      {t('investui.btn.backToLessons')}
    </Link>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div
      className="h-2 w-full rounded-full bg-slate-200"
      role="progressbar"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-2 rounded-full bg-teal-600 transition-all" style={{ width: `${value * 100}%` }} />
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>;
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
      <InvestShell>
        <BackLink />
        <Panel>
          <h1 className="text-3xl font-extrabold text-slate-900">{tx(lesson.titleKey)}</h1>
          <p className="text-lg text-slate-700">{tx(lesson.blurbKey)}</p>
          <p className="text-sm text-slate-500">{t('investui.list.minutes', { n: lesson.estMinutes })}</p>
        </Panel>
        <h2 className="pt-2 font-semibold text-slate-900">{t('investui.intro.depth')}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {([1, 2, 3] as Level[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className="flex min-h-20 items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-start transition-colors hover:border-teal-600 hover:bg-teal-50"
            >
              <span>
                <span className="block text-lg font-bold text-slate-900">{t(`investui.level.${l}`)}</span>
                <span className="block text-sm text-slate-600">{t(`investui.level.${l}.hint`)}</span>
              </span>
              <ChevronIcon dir="right" className="h-5 w-5 shrink-0 text-teal-700" />
            </button>
          ))}
        </div>
      </InvestShell>
    );
  }

  const current = pages[page]!;
  const progress = page / (pages.length - 1);

  // ---------- check ----------
  if (current.kind === 'check') {
    const items = lesson.check.map((id) => checkById.get(id)!).filter((c) => c.level <= level + 1);
    return (
      <InvestShell>
        <Progress value={progress} />
        <Panel>
          <CheckQuiz
            lessonId={lesson.id}
            items={items}
            level={level}
            onDone={(right, total) => {
              setScore({ right, total });
              setPage(page + 1);
            }}
          />
        </Panel>
      </InvestShell>
    );
  }

  // ---------- summary ----------
  if (current.kind === 'summary') {
    const next = allLessons.find((l) => l.order === lesson.order + 1);
    const good = score !== null && score.right >= Math.ceil(score.total * 0.7);
    return (
      <InvestShell>
        <Progress value={1} />
        <Panel>
          <h1 className="text-3xl font-extrabold text-slate-900">{t('investui.summary.title')}</h1>
          {score && <p className="text-lg text-slate-800">{t('investui.summary.score', { right: score.right, total: score.total })}</p>}
          <p className="text-slate-700">{good ? t('investui.summary.good') : t('investui.summary.more')}</p>
          <div className="flex flex-col gap-3 pt-3 sm:flex-row">
            {next && (
              <Link to={`/learn/invest/${next.id}`}>
                <Button size="lg" className="w-full">{tx(next.titleKey)}</Button>
              </Link>
            )}
            <Button size="lg" variant="secondary" onClick={restart}>{t('investui.btn.again')}</Button>
          </div>
        </Panel>
        <BackLink />
      </InvestShell>
    );
  }

  // ---------- a card ----------
  const needsGuess = current.block.type === 'predict' && !predicted.has(page);
  const upNext = pages[page + 1];
  return (
    <InvestShell>
      <Progress value={progress} />
      <BlockCard
        key={`${level}-${page}`}
        block={current.block}
        ctx={ctx}
        onPredictDone={() => setPredicted((s) => new Set(s).add(page))}
      />
      <div className="flex justify-between gap-3 pt-2">
        <Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
          {t('investui.btn.back')}
        </Button>
        <Button size="lg" disabled={needsGuess} onClick={() => setPage(page + 1)}>
          {upNext?.kind === 'check' ? t('investui.btn.startCheck') : t('investui.btn.next')}
        </Button>
      </div>
    </InvestShell>
  );
}
