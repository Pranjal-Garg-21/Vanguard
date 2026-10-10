import { t } from '@/platform';
import { Button } from '@/ui';
import type { Action } from '../logic/types';

/** "Allow this app to…?" Buttons come from the script, so the safe and risky answers are data. */
export function PermissionDialog({ appKey, askKey, actions, onAct }: { appKey: string; askKey: string; actions: Action[]; onAct: (id: string) => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-6" role="alertdialog" aria-label={t(appKey)}>
      <div className="w-full rounded-2xl bg-phone-card p-5 text-phone-ink shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-wider text-phone-muted">{t(appKey)}</p>
        <p className="mt-2 text-base font-semibold leading-snug">{t(askKey)}</p>
        <div className="mt-4 grid gap-2">
          {actions.map((a) => (
            <Button key={a.id} variant="secondary" className="!bg-phone-bubble !text-phone-ink" onClick={() => onAct(a.id)}>
              {t(a.labelKey)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
