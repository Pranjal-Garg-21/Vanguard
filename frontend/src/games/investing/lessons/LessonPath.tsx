/**
 * The lessons as a winding path of tiles, like a board you move along: finished lessons are lit, the next one
 * glows, the rest wait. It is the same list as the card grid, drawn as a route. Owner: P4.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { t } from '@/platform';
import { Icon } from '@/ui';
import { lessonTitle } from './LessonGrid';
import type { RoomSummary } from './logic/room';
import type { Room } from './logic/types';

type State = 'done' | 'next' | 'todo';

const TOP: Record<State, string> = { done: '#a3ea2a', next: '#2e3d60', todo: '#243252' };
const SIDE: Record<State, [string, string]> = { done: ['#6fa80f', '#548508'], next: ['#1c2742', '#141c2e'], todo: ['#1c2742', '#141c2e'] };

function Tile({ state, children }: { state: State; children: ReactNode }) {
  const [left, right] = SIDE[state];
  return (
    <span className={`relative inline-block h-[5.5rem] w-32 ${state === 'next' ? 'motion-safe:animate-[mascot-bob_2.4s_ease-in-out_infinite]' : ''}`}>
      <svg viewBox="0 0 96 72" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {state === 'next' && <ellipse cx="48" cy="40" rx="46" ry="22" fill="#a3ea2a" fillOpacity="0.18" />}
        <polygon points="4,30 48,52 48,64 4,42" fill={left} />
        <polygon points="92,30 48,52 48,64 92,42" fill={right} />
        <polygon points="48,8 92,30 48,52 4,30" fill={TOP[state]} stroke={state === 'todo' ? '#3e4b69' : '#a3ea2a'} strokeWidth="2" strokeOpacity={state === 'next' ? 1 : 0.7} />
      </svg>
      <span className={`absolute inset-x-0 top-[1.35rem] flex justify-center text-2xl font-extrabold ${state === 'done' ? 'text-brand-ink' : state === 'next' ? 'text-brand' : 'text-muted'}`}>
        {children}
      </span>
    </span>
  );
}

/** Lessons per row: all 14 fit in two rows on a laptop. The route snakes: left to right, a U-turn, then right to left. */
const PER_ROW = 7;
const VIEW_W = 1000;
const ROW_H = 210;
/** From the top of a node to the middle of its tile's top face. */
const TILE_MID = 37;
const BULGE = 34;

type Pt = { x: number; y: number; row: number };

function place(i: number): Pt {
  const row = Math.floor(i / PER_ROW);
  const col = i % PER_ROW;
  const c = row % 2 === 0 ? col : PER_ROW - 1 - col;
  // A gentle up-and-down along the row, so the route curves instead of ruling a straight line.
  const wave = i % 2 === 0 ? 0 : 22;
  return { x: ((c + 0.5) / PER_ROW) * VIEW_W, y: row * ROW_H + wave, row };
}

/** A smooth curve between two neighbouring tiles; a U-turn round the edge when the route changes row. */
function link(a: Pt, b: Pt): string {
  const ay = a.y + TILE_MID;
  const by = b.y + TILE_MID;
  if (a.row !== b.row) {
    const side = a.x > VIEW_W / 2 ? 1 : -1;
    return `M${a.x},${ay} C${a.x + side * BULGE * 1.6},${ay} ${b.x + side * BULGE * 1.6},${by} ${b.x},${by}`;
  }
  const mid = (a.x + b.x) / 2;
  return `M${a.x},${ay} C${mid},${ay} ${mid},${by} ${b.x},${by}`;
}

export function LessonPath({ lessons, summaries, upNextId }: { lessons: Room[]; summaries: Record<string, RoomSummary> | undefined; upNextId?: string }) {
  const points = lessons.map((_, i) => place(i));
  const rows = Math.ceil(lessons.length / PER_ROW);
  const height = (rows - 1) * ROW_H + 22 + 190;
  const isDone = (i: number) => summaries?.[lessons[i]!.id]?.status === 'done';

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative mx-12 min-w-[58rem]" style={{ height }}>
        {/* The route: a dashed track under everything, lit green up to the lesson the player has finished. */}
        <svg viewBox={`0 0 ${VIEW_W} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          {points.slice(0, -1).map((a, i) => (
            <g key={i}>
              <path d={link(a, points[i + 1]!)} fill="none" stroke="#3e4b69" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              {isDone(i) && <path d={link(a, points[i + 1]!)} fill="none" stroke="#a3ea2a" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
            </g>
          ))}
        </svg>

        <ol>
          {lessons.map((lesson, i) => {
            const p = points[i]!;
            const done = isDone(i);
            const state: State = done ? 'done' : lesson.id === upNextId ? 'next' : 'todo';
            return (
              <li key={lesson.id} className="absolute w-36 -translate-x-1/2" style={{ left: `${(p.x / VIEW_W) * 100}%`, top: p.y }}>
                <Link
                  to={`/learn/${lesson.pillar}/${lesson.id}`}
                  className="group flex flex-col items-center gap-2 rounded-xl px-1 pb-2 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <Tile state={state}>{done ? <Icon name="check" className="h-7 w-7" /> : lesson.order}</Tile>
                  <span className="block">
                    <span className={`block text-xs font-bold tracking-wide uppercase ${state === 'next' ? 'text-brand' : 'text-muted'}`}>
                      {t(state === 'done' ? 'investui.list.status.done' : state === 'next' ? 'investui.list.upnext' : 'investui.list.start')}
                    </span>
                    <span className={`mt-0.5 block text-sm leading-snug font-bold ${state === 'todo' ? 'text-ink-soft' : 'text-ink'} group-hover:text-brand`}>
                      {lessonTitle(lesson)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
