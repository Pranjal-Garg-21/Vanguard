/**
 * The fixed guardrail banner shown on every investing screen.
 * Owner: P4. Part of the design kit.
 */
import { t } from '@/platform';
import { Alert } from '@/components/ui/alert';

export function SimBanner() {
  return (
    <div role="note">
      <Alert variant="warn">
        <span className="font-bold text-warn">Note: </span>
        {t('investui.banner')}
      </Alert>
    </div>
  );
}
