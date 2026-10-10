/** A walking-character sprite drawn in the DOM (battle screen, trainer card), crisp at any size. */
import { LEGEND } from '@/core/world';
import { RPG_URBAN } from '@/ui';

const DIR_COL = { left: 23, down: 24, up: 25, right: 26 } as const;

export function Sprite({ sprite, dir, size, label }: { sprite: string; dir: keyof typeof DIR_COL; size: number; label?: string }) {
  const def = LEGEND.sprites[sprite] ?? { char: 0 };
  const col = DIR_COL[dir];
  const row = def.char * 3;
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="inline-block"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${RPG_URBAN.url})`,
        backgroundSize: `${RPG_URBAN.columns * size}px ${RPG_URBAN.rows * size}px`,
        backgroundPosition: `-${col * size}px -${row * size}px`,
        imageRendering: 'pixelated',
        filter: def.hue ? `hue-rotate(${def.hue}deg)` : undefined,
      }}
    />
  );
}

