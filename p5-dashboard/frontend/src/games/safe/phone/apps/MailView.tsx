import { t } from '@/platform';
import { Lensable, RichText, type ViewProps } from '../Text';
import type { Surface } from '../logic/types';

/** Mail with the sender address always visible, because checking it is the habit we teach. */
export function MailView({ surface, view }: { surface: Extract<Surface, { type: 'mail' }>; view: ViewProps }) {
  return (
    <div className="p-4 text-phone-ink">
      <h2 className="text-lg font-bold leading-snug">{t(surface.subjectKey)}</h2>
      <div className="my-3 border-y border-phone-line py-2 text-sm">
        <p>
          <span className="text-phone-muted">{t('safe.ui.from')}: </span>
          <span className="font-medium">{surface.fromName}</span>{' '}
          <Lensable surface={surface} lens={surface.fromLens} view={view}>
            <span className="text-phone-muted">&lt;{surface.fromAddress}&gt;</span>
          </Lensable>
        </p>
      </div>
      <p className="text-[15px] leading-relaxed">
        <RichText segments={surface.body} surface={surface} view={view} />
      </p>
    </div>
  );
}
