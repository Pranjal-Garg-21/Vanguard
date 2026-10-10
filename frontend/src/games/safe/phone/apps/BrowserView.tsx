import { t } from '@/platform';
import { Icon } from '../Icon';
import { Lensable, RichText, type ViewProps } from '../Text';
import type { Surface } from '../logic/types';

/** A fake page behind a fake address bar. The address is inspectable, because reading it is the habit. */
export function BrowserView({ surface, view }: { surface: Extract<Surface, { type: 'page' }>; view: ViewProps }) {
  return (
    <div className="text-phone-ink">
      {surface.url && (
        <div className="flex items-center gap-2 border-b border-phone-line bg-phone-card px-3 py-2">
          <Icon name="lock" className="h-4 w-4 text-phone-muted" />
          <p className="min-w-0 flex-1 truncate rounded-full bg-phone-bubble px-3 py-1 font-mono text-xs">
            <Lensable surface={surface} lens={surface.urlLens} view={view}>{surface.url}</Lensable>
          </p>
        </div>
      )}
      <div className="p-4">
        <h2 className="text-lg font-bold">{t(surface.titleKey)}</h2>
        <p className="mt-2 text-[15px] leading-relaxed">
          <RichText segments={surface.body} surface={surface} view={view} />
        </p>
        <div className="mt-4 space-y-3">
          {surface.fields?.map((f) => (
            <label key={f.id} className="block text-sm font-medium">
              {t(f.labelKey)}
              <input
                disabled
                placeholder="• • • • • •"
                className="mt-1 block w-full rounded-lg border border-phone-line bg-phone-card px-3 py-2 text-phone-ink placeholder:text-phone-muted"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
