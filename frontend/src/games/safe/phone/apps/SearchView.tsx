import { t } from '@/platform';
import { Lensable, type ViewProps } from '../Text';
import type { Surface } from '../logic/types';
import { Icon } from '@/ui';

/**
 * A search results page. Each result is a choice: tapping it runs the
 * script's action for that result. With the Scam Lens on, tapping a result
 * inspects its address instead. Ads look just like results, as they do for real.
 */
export function SearchView({ surface, view }: { surface: Extract<Surface, { type: 'search' }>; view: ViewProps }) {
  return (
    <div className="text-phone-ink">
      <div className="flex items-center gap-2 border-b border-phone-line bg-phone-card px-3 py-2">
        <Icon name="search" className="h-4 w-4 text-phone-muted" />
        <p className="min-w-0 flex-1 truncate rounded-full bg-phone-bubble px-3 py-1 text-sm">{surface.query}</p>
      </div>
      <ul>
        {surface.results.map((r) => {
          const lensDef = surface.lens?.find((l) => l.id === r.urlLens);
          const tap = () => {
            if (view.resolved) return;
            if (view.lensOn && lensDef) return view.onInspect(lensDef.id);
            view.onAct(r.action);
          };
          return (
            <li key={r.id} className="border-b border-phone-line px-4 py-3">
              <div className="flex items-center gap-2 text-xs">
                {r.ad && <span className="rounded border border-phone-ink px-1 py-px text-[10px] font-bold">{t('safe.ui.ad')}</span>}
                <Lensable surface={surface} lens={r.urlLens} view={view}>
                  <span className="truncate text-emerald-700">{r.url}</span>
                </Lensable>
              </div>
              <button type="button" onClick={tap} disabled={!!view.resolved && !view.debrief} className="mt-1 block text-start text-base font-medium text-phone-link underline-offset-2 hover:underline disabled:no-underline">
                {t(r.titleKey, view.vars)}
              </button>
              <p className="mt-0.5 text-sm text-phone-muted">{t(r.snippetKey, view.vars)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
