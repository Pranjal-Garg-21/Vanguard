/**
 * The fixed guardrail banner shown on every investing screen.
 * Owner: P4. Part of the design kit.
 */
import { t } from '@/platform';

export function SimBanner() {
  return (
    <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <span className="font-semibold">Note: </span>
      {t('investui.banner')}
    </div>
  );
}
