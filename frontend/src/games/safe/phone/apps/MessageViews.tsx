/** Messages (SMS) and Chat threads. Generic: no real app branding. Owner: P5. */
import { t } from '@/platform';
import { Lensable, RichText, type ViewProps } from '../Text';
import type { Surface } from '../logic/types';

type Sms = Extract<Surface, { type: 'sms' }>;
type Chat = Extract<Surface, { type: 'chat' }>;

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-phone-link/15 text-sm font-bold text-phone-link" aria-hidden>
      {name.replace(/[^A-Za-z]/g, '').slice(0, 1).toUpperCase() || '?'}
    </span>
  );
}

export function SmsView({ surface, view }: { surface: Sms; view: ViewProps }) {
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={surface.from} />
        <p className="font-semibold text-phone-ink">
          <Lensable surface={surface} lens={surface.fromLens} view={view}>{surface.from}</Lensable>
        </p>
      </div>
      <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-phone-bubble px-3.5 py-2.5 text-[15px] leading-relaxed text-phone-ink">
        <RichText segments={surface.body} surface={surface} view={view} />
      </div>
    </div>
  );
}

export function ChatView({ surface, view }: { surface: Chat; view: ViewProps }) {
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={surface.from} />
        <div>
          <p className="font-semibold text-phone-ink">
            <Lensable surface={surface} lens={surface.fromLens} view={view}>{surface.from}</Lensable>
          </p>
          {surface.online && <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{t('safe.ui.online')}</p>}
        </div>
      </div>
      <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-phone-bubble px-3.5 py-2.5 text-[15px] leading-relaxed text-phone-ink">
        <RichText segments={surface.body} surface={surface} view={view} />
      </div>
    </div>
  );
}
