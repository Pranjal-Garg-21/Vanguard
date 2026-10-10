/**
 * Tile-based graphics: draw one tile from a sprite sheet, or a whole map from
 * a text layout. Tiles are sized in percentages, so a map scales to any
 * screen width and stays crisp (image-rendering: pixelated).
 */
import type { CSSProperties } from 'react';
import type { TileSheet } from './sheets';

function tileStyle(sheet: TileSheet, index: number): CSSProperties {
  const col = index % sheet.columns;
  const row = Math.floor(index / sheet.columns);
  const x = sheet.columns > 1 ? (col / (sheet.columns - 1)) * 100 : 0;
  const y = sheet.rows > 1 ? (row / (sheet.rows - 1)) * 100 : 0;
  return {
    backgroundImage: `url(${sheet.url})`,
    backgroundSize: `${sheet.columns * 100}% ${sheet.rows * 100}%`,
    backgroundPosition: `${x}% ${y}%`,
    imageRendering: 'pixelated',
  };
}

/** One tile, filling its (square) parent. */
export function Tile({ sheet, index, label }: { sheet: TileSheet; index: number; label?: string }) {
  return (
    <span
      className="block aspect-square w-full"
      style={tileStyle(sheet, index)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

/** One or several tiles stacked bottom → top (e.g. grass, then a tree). */
export type LegendEntry = { sheet: TileSheet; index: number }[];

/**
 * A map drawn from text rows. Each character is looked up in `legend`; a
 * character with no entry (like a space) draws nothing.
 *
 *   rows: ['gggg', 'gTHg']   legend: { g: [grass], T: [grass, tree], H: [grass, house] }
 */
export function TileMap({
  rows,
  legend,
  className = '',
  label,
}: {
  rows: string[];
  legend: Record<string, LegendEntry>;
  className?: string;
  label?: string;
}) {
  const columns = Math.max(...rows.map((r) => r.length));
  return (
    <div
      className={`grid w-full ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rows.flatMap((row, y) =>
        Array.from({ length: columns }, (_, x) => {
          const layers = legend[row[x] ?? ' '] ?? [];
          return (
            <span key={`${y}-${x}`} className="relative block aspect-square">
              {layers.map((layer, i) => (
                <span key={i} className="absolute inset-0 block" style={tileStyle(layer.sheet, layer.index)} />
              ))}
            </span>
          );
        }),
      )}
    </div>
  );
}
