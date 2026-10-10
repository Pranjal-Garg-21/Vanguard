/**
 * First-launch setup (UC-SYS-01): language → accessibility → class → avatar →
 * picture-PIN → done. Owner: P5. Hands over to P1's character builder.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  checkClassCode,
  createProfile,
  JOIN_CODE_LENGTH,
  normaliseJoinCode,
  t,
  useLanguage,
  setLanguage as applyLanguage,
  type Accessibility,
  type ClassCheck,
  type Language,
} from '@/platform';
import { AudioButton, Button, Notice } from '@/ui';
import { PicturePin } from './components/PicturePin';
import { StudentScreen } from './components/StudentScreen';
import { AVATARS, LANGUAGES } from './pictures';

const STEPS = ['language', 'a11y', 'class', 'avatar', 'pin', 'confirm', 'done'] as const;
type Step = (typeof STEPS)[number];

const A11Y_OPTIONS: { key: keyof Accessibility; icon: string }[] = [
  { key: 'audio', icon: '🔊' },
  { key: 'largeText', icon: '🔠' },
  { key: 'reduceMotion', icon: '🐢' },
  { key: 'timersOff', icon: '⏱️' },
];

export function SetupFlow() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const codeFromLink = normaliseJoinCode(params.get('code') ?? '');

  // Subscribes this screen to the language, so picking one redraws the rest of setup.
  useLanguage();
  const [step, setStep] = useState<Step>('language');
  const [language, setLanguage] = useState<Language>('en');
  const [a11y, setA11y] = useState<Accessibility>({ audio: false, largeText: false, reduceMotion: false, timersOff: false });
  const [classCode, setClassCode] = useState(codeFromLink);
  const [classCheck, setClassCheck] = useState<ClassCheck | 'checking' | null>(null);
  const [avatarId, setAvatarId] = useState<string>(AVATARS[0].id);
  const [name, setName] = useState('');
  const [pin, setPin] = useState<string[]>([]);
  const [pinError, setPinError] = useState(false);
  const [pinAttempt, setPinAttempt] = useState(0);
  const [saving, setSaving] = useState(false);

  const index = STEPS.indexOf(step);
  const go = (next: Step) => setStep(next);
  const back = () => (index === 0 ? navigate('/') : setStep(STEPS[index - 1]!));

  // Check the class code as soon as all 6 characters are typed.
  useEffect(() => {
    if (classCode.length !== JOIN_CODE_LENGTH) {
      setClassCheck(null);
      return;
    }
    let cancelled = false;
    setClassCheck('checking');
    checkClassCode(classCode).then((result) => !cancelled && setClassCheck(result));
    return () => {
      cancelled = true;
    };
  }, [classCode]);

  const finish = async (pictures: string[], joinClass: boolean) => {
    setSaving(true);
    const result = classCheck && classCheck !== 'checking' ? classCheck : null;
    await createProfile({
      displayName: name.trim(),
      avatarId,
      pinPictures: pictures,
      language,
      a11y,
      classCode: joinClass ? classCode : null,
      classStatus: result?.status === 'valid' ? 'valid' : 'pending',
    });
    setSaving(false);
    go('done');
  };

  const confirmPin = (pictures: string[]) => {
    if (pictures.join() === pin.join()) {
      void finish(pictures, classCode.length === JOIN_CODE_LENGTH && classCheck !== null && classCheck !== 'checking' && classCheck.status !== 'invalid');
    } else {
      setPinError(true);
      setPin([]);
      setPinAttempt((n) => n + 1);
      go('pin');
    }
  };

  const classValid = classCheck !== null && classCheck !== 'checking' && classCheck.status !== 'invalid';

  return (
    <StudentScreen>
      {step !== 'done' && (
        <header className="mb-6 flex items-center justify-between">
          <button type="button" className="min-h-11 px-2 font-semibold text-teal-800" onClick={back}>
            ← {t('setup.steps.back')}
          </button>
          <div className="flex gap-1.5" aria-label={t('setup.steps.progress', { current: index + 1, total: STEPS.length - 1 })}>
            {STEPS.slice(0, -1).map((s, i) => (
              <span key={s} className={`h-2 w-6 rounded-full ${i <= index ? 'bg-teal-700' : 'bg-slate-200'}`} />
            ))}
          </div>
        </header>
      )}

      {step === 'language' && (
        <StepBody title={t('setup.language.title')} speak={['setup.language.title', 'setup.language.note']}>
          <div className="grid grid-cols-2 gap-3">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setLanguage(l.id);
                  // The rest of setup is read in the language just chosen, so a
                  // student who cannot read English is not stuck on screen two.
                  applyLanguage(l.id);
                  go('a11y');
                }}
                className={`flex aspect-[4/3] flex-col items-center justify-center rounded-2xl border-2 bg-white shadow-sm transition active:scale-95 ${
                  language === l.id ? 'border-teal-700' : 'border-slate-200 hover:border-teal-600'
                }`}
              >
                <span className="text-3xl font-bold" dir={l.id === 'ur' ? 'rtl' : 'ltr'}>
                  {l.native}
                </span>
                <span className="mt-1 text-sm text-slate-500">{l.english}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-slate-500">{t('setup.language.note')}</p>
        </StepBody>
      )}

      {step === 'a11y' && (
        <StepBody title={t('setup.a11y.title')} speak={['setup.a11y.title', 'setup.a11y.audio', 'setup.a11y.largeText', 'setup.a11y.reduceMotion', 'setup.a11y.timersOff', 'setup.a11y.timersOffHint']}>
          <div className="space-y-3">
            {A11Y_OPTIONS.map(({ key, icon }) => (
              <label key={key} className="flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                <span className="text-2xl">{icon}</span>
                <span className="flex-1">
                  <span className="block text-lg font-semibold">{t(`setup.a11y.${key}`)}</span>
                  {key === 'timersOff' && <span className="block text-sm text-slate-500">{t('setup.a11y.timersOffHint')}</span>}
                </span>
                <input
                  type="checkbox"
                  className="h-6 w-6 accent-teal-700"
                  checked={a11y[key]}
                  onChange={(e) => setA11y({ ...a11y, [key]: e.target.checked })}
                />
              </label>
            ))}
          </div>
          <Button size="lg" className="mt-8 w-full" onClick={() => go('class')}>
            {t('setup.steps.next')}
          </Button>
        </StepBody>
      )}

      {step === 'class' && (
        <StepBody title={t('setup.class.title')} subtitle={t('setup.class.hint')} speak={['setup.class.title', 'setup.class.hint']}>
          <input
            autoFocus
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            value={classCode}
            onChange={(e) => setClassCode(normaliseJoinCode(e.target.value))}
            placeholder="ABC123"
            className="w-full rounded-2xl border-2 border-slate-300 bg-white p-4 text-center font-mono text-4xl tracking-[0.3em] uppercase focus:border-teal-700 focus:outline-none"
            aria-label={t('setup.class.title')}
          />
          <div className="mt-4 min-h-12">
            {classCheck === 'checking' && <p className="text-center text-slate-500">{t('setup.class.checking')}</p>}
            {classCheck && classCheck !== 'checking' && classCheck.status === 'valid' && (
              <Notice tone="info">✅ {t('setup.class.valid', { name: classCheck.name })}</Notice>
            )}
            {classCheck && classCheck !== 'checking' && classCheck.status === 'invalid' && <Notice tone="bad">{t('setup.class.invalid')}</Notice>}
            {classCheck && classCheck !== 'checking' && classCheck.status === 'unchecked' && <Notice>{t('setup.class.unchecked')}</Notice>}
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Button size="lg" disabled={!classValid} onClick={() => go('avatar')}>
              {t('setup.steps.next')}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => {
                setClassCode('');
                go('avatar');
              }}
            >
              {t('setup.class.noClass')}
            </Button>
          </div>
        </StepBody>
      )}

      {step === 'avatar' && (
        <StepBody title={t('setup.avatar.title')} speak={['setup.avatar.title', 'setup.avatar.nameLabel', 'setup.avatar.nameHint']}>
          <div className="grid grid-cols-4 gap-3">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAvatarId(a.id)}
                aria-pressed={avatarId === a.id}
                className={`flex aspect-square items-center justify-center rounded-2xl border-2 bg-white text-4xl shadow-sm transition active:scale-95 ${
                  avatarId === a.id ? 'border-teal-700 ring-4 ring-teal-100' : 'border-slate-200'
                }`}
              >
                {a.emoji}
              </button>
            ))}
          </div>
          <label className="mt-6 block">
            <span className="text-lg font-semibold">{t('setup.avatar.nameLabel')}</span>
            <input
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('setup.avatar.namePlaceholder')}
              className="mt-2 w-full rounded-2xl border-2 border-slate-300 bg-white p-4 text-xl focus:border-teal-700 focus:outline-none"
            />
            <span className="mt-1 block text-sm text-slate-500">{t('setup.avatar.nameHint')}</span>
          </label>
          <Button size="lg" className="mt-6 w-full" disabled={name.trim().length < 2} onClick={() => go('pin')}>
            {t('setup.steps.next')}
          </Button>
        </StepBody>
      )}

      {step === 'pin' && (
        <StepBody title={t('setup.pin.createTitle')} subtitle={t('setup.pin.createHint')} speak={['setup.pin.createTitle', 'setup.pin.createHint']}>
          {pinError && <div className="mb-4"><Notice tone="bad">{t('setup.pin.mismatch')}</Notice></div>}
          <PicturePin
            resetKey={`create-${pinAttempt}`}
            onComplete={(pictures) => {
              setPin(pictures);
              setPinError(false);
              go('confirm');
            }}
          />
          <p className="mt-4 text-center text-sm text-slate-500">🤚 {t('setup.pin.coverTip')}</p>
        </StepBody>
      )}

      {step === 'confirm' && (
        <StepBody title={t('setup.pin.confirmTitle')} speak={['setup.pin.confirmTitle']}>
          <PicturePin resetKey={`confirm-${pinAttempt}`} disabled={saving} onComplete={confirmPin} />
        </StepBody>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center pt-16 text-center">
          <div className="text-7xl">{AVATARS.find((a) => a.id === avatarId)?.emoji}</div>
          <h1 className="mt-6 text-3xl font-extrabold">{t('setup.done.title', { name: name.trim() })}</h1>
          <p className="mt-3 text-lg text-slate-600">{t('setup.done.body')}</p>
          <Button size="lg" className="mt-10 w-full" onClick={() => navigate('/onboarding')}>
            {t('setup.done.go')}
          </Button>
        </div>
      )}
    </StudentScreen>
  );
}

/**
 * `speak` is the keys of the title and any hint. Setup is the first thing a
 * student sees, so it has to work for someone who cannot read it: the speaker
 * button is here on every step, before the "Read things aloud" setting even
 * exists on their profile.
 */
function StepBody({ title, subtitle, children, speak }: { title: string; subtitle?: string; children: ReactNode; speak?: string[] }) {
  return (
    <section>
      <div className="flex items-start gap-2">
        <h1 className="flex-1 text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {speak && <AudioButton keys={speak} className="-mt-1 text-teal-800" />}
      </div>
      {subtitle && <p className="mt-2 text-lg text-slate-600">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}
