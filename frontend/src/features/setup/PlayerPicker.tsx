/**
 * Shared-device login (UC-SYS-04): avatar grid → picture-PIN. Owner: P5.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { listProfiles, t, unlockProfile, type ProfileSummary } from '@/platform';
import { Notice } from '@/ui';
import { PicturePin } from './components/PicturePin';
import { StudentScreen } from './components/StudentScreen';
import { avatarEmoji } from './pictures';

export function PlayerPicker() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [selected, setSelected] = useState<ProfileSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    listProfiles().then(setProfiles);
  }, []);

  // Tick while locked so the countdown updates.
  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const locked = lockedUntil > now;
  const secondsLeft = Math.ceil((lockedUntil - now) / 1000);

  const tryPin = async (pictures: string[]) => {
    if (!selected) return;
    const result = await unlockProfile(selected.pid, pictures);
    if (result.ok) {
      navigate('/home');
      return;
    }
    setAttempt((n) => n + 1);
    if (result.lockedForMs > 0) {
      setLockedUntil(Date.now() + result.lockedForMs);
      setNow(Date.now());
      setMessage(null);
    } else {
      setMessage(t('setup.pin.wrong', { left: result.attemptsLeft }));
    }
  };

  if (selected) {
    return (
      <StudentScreen>
        <button type="button" className="mb-6 min-h-11 px-2 font-semibold text-brand" onClick={() => setSelected(null)}>
          ← {t('setup.steps.back')}
        </button>
        <div className="text-center">
          <div className="text-6xl">{avatarEmoji(selected.avatarId)}</div>
          <h1 className="mt-3 text-2xl font-extrabold">{t('setup.pin.enterTitle', { name: selected.displayName })}</h1>
        </div>
        <div className="mt-4 min-h-12">
          {locked && <Notice tone="bad">{t('setup.pin.locked', { seconds: secondsLeft })}</Notice>}
          {!locked && message && <Notice tone="bad">{message}</Notice>}
        </div>
        <PicturePin resetKey={attempt} disabled={locked} onComplete={tryPin} />
      </StudentScreen>
    );
  }

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
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{t('setup.picker.title')}</h1>
      <div className="mt-8 grid grid-cols-3 gap-4">
        {profiles.map((p) => (
          <button
            key={p.pid}
            type="button"
            onClick={() => {
              setSelected(p);
              setMessage(null);
            }}
            className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface p-3 transition active:scale-95 hover:border-brand"
          >
            <span className="text-5xl">{avatarEmoji(p.avatarId)}</span>
            <span className="w-full truncate text-center font-semibold">{p.displayName}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => navigate('/setup')}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong p-3 text-ink-soft hover:border-brand"
        >
          <span className="text-4xl">＋</span>
          <span className="font-semibold">{t('setup.picker.newPlayer')}</span>
        </button>
      </div>
    </StudentScreen>
  );
}
