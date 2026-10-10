/**
 * Developer page: shows every tile of each sheet with its index, so the
 * named tiles in ui/tiles/town.ts can be checked and corrected.
 */
import { SHEETS, Tile, type SheetName } from '@/ui';

export function TileInspector() {
  return (
    <div className="min-h-dvh bg-slate-100 p-4 font-sans text-slate-900">
      <h1 className="text-2xl font-bold">Tile inspector</h1>
      <p className="mt-1 text-sm">
        Each number is the tile index to use in <code>ui/tiles/town.ts</code>. If the sheet looks empty, the PNGs are not in{' '}
        <code>public/assets/</code> yet.
      </p>

      {(Object.keys(SHEETS) as SheetName[]).map((name) => {
        const sheet = SHEETS[name];
        const count = sheet.columns * sheet.rows;
        return (
          <section key={name} className="mt-6">
            <h2 className="font-bold">
              {name} · {sheet.columns}×{sheet.rows} · <span className="font-normal">{sheet.url}</span>
            </h2>
            <div className="mt-2 grid max-w-3xl gap-1" style={{ gridTemplateColumns: `repeat(${sheet.columns}, 1fr)` }}>
              {Array.from({ length: count }, (_, index) => (
                <div key={index} className="bg-slate-300 p-0.5 text-center text-[10px] font-semibold leading-tight">
                  <Tile sheet={sheet} index={index} />
                  {index}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
