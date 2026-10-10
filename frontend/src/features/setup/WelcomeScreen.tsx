import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { listProfiles, t } from '@/platform';
import { Button } from '@/ui';
import { StudentScreen } from './components/StudentScreen';

export function WelcomeScreen() {
  const navigate = useNavigate();
  const [hasProfiles, setHasProfiles] = useState(false);

  useEffect(() => {
    listProfiles().then((p) => setHasProfiles(p.length > 0));
  }, []);

  return (
    <StudentScreen
      footer={
        <p className="text-center text-sm">
          <Link className="font-semibold text-brand underline" to="/facilitator">
            {t('setup.welcome.facilitator')}
          </Link>
        </p>
      }
    >
      <div className="flex flex-col items-center pt-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-brand text-4xl font-bold text-brand-ink">P</div>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-ink">{t('setup.welcome.title')}</h1>
        <p className="mt-3 max-w-xs text-lg text-ink-soft">{t('setup.welcome.tagline')}</p>

        <div className="mt-12 flex w-full flex-col gap-3">
          <Button size="lg" onClick={() => navigate('/setup')}>
            {t('setup.welcome.start')}
          </Button>
          {hasProfiles && (
            <Button size="lg" variant="secondary" onClick={() => navigate('/who')}>
              {t('setup.welcome.returning')}
            </Button>
          )}
        </div>
      </div>
    </StudentScreen>
  );
}
