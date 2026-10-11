/**
 * A short burst of confetti, the "party popper" when a student gets something
 * right. Plain CSS pieces, no emoji. Skipped when the student prefers reduced
 * motion. Change `trigger` to a new positive number to fire another burst.
 */
import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '@/platform';

type Piece = { id: number; color: string; w: number; h: number; dx: number; dy1: number; dy2: number; rot: number; delay: number; dur: number };

const COLORS = ['#a3ea2a', '#b57cff', '#ffb72b', '#3dc8f5', '#ff5468', '#f4f6fa'];

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    color: COLORS[id % COLORS.length] as string,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    dx: (Math.random() - 0.5) * 90,
    dy1: -(18 + Math.random() * 38),
    dy2: 30 + Math.random() * 40,
    rot: (Math.random() - 0.5) * 900,
    delay: Math.random() * 0.12,
    dur: 1.3 + Math.random() * 0.9,
  }));
}

export function Confetti({ trigger, count = 48 }: { trigger: number; count?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (trigger <= 0) return;
    if (prefersReducedMotion()) return;
    setPieces(makePieces(count));
    const id = window.setTimeout(() => setPieces([]), 2600);
    return () => window.clearTimeout(id);
  }, [trigger, count]);

  if (pieces.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti"
          style={{
            width: p.w,
            height: p.h,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ['--dx' as string]: `${p.dx}vw`,
            ['--dy1' as string]: `${p.dy1}vh`,
            ['--dy2' as string]: `${p.dy2}vh`,
            ['--rot' as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}
