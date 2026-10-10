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
  type Accessibility,
  type ClassCheck,
  type Language,
} from '@/platform';
import { Button, Icon, Notice } from '@/ui';
import { PicturePin } from './components/PicturePin';
import { StudentScreen } from './components/StudentScreen';
import { AVATARS, LANGUAGES } from './pictures';

const STEPS = ['language', 'a11y', 'class', 'avatar', 'pin', 'confirm', 'done'] as const;
type Step = (typeof STEPS)[number];
import { Avatar } from './components/Avatar';

const A11Y_OPTIONS: { key: keyof Accessibility }[] = [{ key: 'audio' }, { key: 'largeText' }, { key: 'reduceMotion' }, { key: 'timersOff' }];

export function SetupFlow() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const codeFromLink = normaliseJoinCode(params.get('code') ?? '');

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
          <button type="button" className="inline-flex min-h-11 items-center gap-1 px-2 font-semibold text-brand" onClick={back}>
            <Icon name="arrowLeft" className="h-4 w-4" />
            {t('setup.steps.back')}
          </button>
          <div className="flex gap-1.5" aria-label={t('setup.steps.progress', { current: index + 1, total: STEPS.length - 1 })}>
            {STEPS.slice(0, -1).map((s, i) => (
              <span key={s} className={`h-2 w-6 rounded-full ${i <= index ? 'bg-brand' : 'bg-surface-3'}`} />
            ))}
          </div>
        </header>
      )}

      {step === 'language' && (
        <StepBody title={t('setup.language.title')}>
          <div className="grid grid-cols-2 gap-3">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setLanguage(l.id);
                  go('a11y');
                }}
                className={`flex aspect-[4/3] flex-col items-center justify-center rounded-xl border-2 bg-surface transition active:scale-95 ${
                  language === l.id ? 'border-brand' : 'border-line hover:border-brand'
                }`}
              >
                <span className="text-3xl font-bold" dir={l.id === 'ur' ? 'rtl' : 'ltr'}>
                  {l.native}
                </span>
                <span className="mt-1 text-sm text-muted">{l.english}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-muted">{t('setup.language.note')}</p>
        </StepBody>
      )}

      {step === 'a11y' && (
        <StepBody title={t('setup.a11y.title')}>
          <div className="space-y-3">
            {A11Y_OPTIONS.map(({ key }) => (
              <label key={key} className="flex min-h-16 cursor-pointer items-center gap-4 rounded-xl border border-line bg-surface px-4">
                <span className="flex-1">
                  <span className="block text-lg font-semibold">{t(`setup.a11y.${key}`)}</span>
                  {key === 'timersOff' && <span className="block text-sm text-muted">{t('setup.a11y.timersOffHint')}</span>}
                </span>
                <input
                  type="checkbox"
                  className="h-6 w-6 accent-brand"
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
        <StepBody title={t('setup.class.title')} subtitle={t('setup.class.hint')}>
          <input
            autoFocus
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            value={classCode}
            onChange={(e) => setClassCode(normaliseJoinCode(e.target.value))}
            placeholder="ABC123"
            className="w-full rounded-xl border-2 border-line-strong bg-surface p-4 text-center font-mono text-4xl tracking-[0.3em] uppercase focus:border-brand focus:outline-none"
            aria-label={t('setup.class.title')}
          />
          <div className="mt-4 min-h-12">
            {classCheck === 'checking' && <p className="text-center text-muted">{t('setup.class.checking')}</p>}
            {classCheck && classCheck !== 'checking' && classCheck.status === 'valid' && (
              <Notice tone="info">{t('setup.class.valid', { name: classCheck.name })}</Notice>
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
        <StepBody title={t('setup.avatar.title')}>
          <div className="grid grid-cols-4 gap-3">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAvatarId(a.id)}
                aria-pressed={avatarId === a.id}
                className={`flex aspect-square items-center justify-center rounded-xl border-2 bg-surface transition active:scale-95 ${
                  avatarId === a.id ? 'border-brand ring-4 ring-brand/25' : 'border-line'
                }`}
              >
                <Avatar id={a.id} className="h-14 w-14" iconClassName="h-7 w-7" />
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
              className="mt-2 w-full rounded-xl border-2 border-line-strong bg-surface p-4 text-xl focus:border-brand focus:outline-none"
            />
            <span className="mt-1 block text-sm text-muted">{t('setup.avatar.nameHint')}</span>
          </label>
          <Button size="lg" className="mt-6 w-full" disabled={name.trim().length < 2} onClick={() => go('pin')}>
            {t('setup.steps.next')}
          </Button>
        </StepBody>
      )}

      {step === 'pin' && (
        <StepBody title={t('setup.pin.createTitle')} subtitle={t('setup.pin.createHint')}>
          {pinError && <div className="mb-4"><Notice tone="bad">{t('setup.pin.mismatch')}</Notice></div>}
          <PicturePin
            resetKey={`create-${pinAttempt}`}
            onComplete={(pictures) => {
              setPin(pictures);
              setPinError(false);
              go('confirm');
            }}
          />
          <p className="mt-4 text-center text-sm text-muted">{t('setup.pin.coverTip')}</p>
        </StepBody>
      )}

      {step === 'confirm' && (
        <StepBody title={t('setup.pin.confirmTitle')}>
          <PicturePin resetKey={`confirm-${pinAttempt}`} disabled={saving} onComplete={confirmPin} />
        </StepBody>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center pt-16 text-center">
          <Avatar id={avatarId} className="h-24 w-24" iconClassName="h-12 w-12" />
          <h1 className="mt-6 text-3xl font-extrabold">{t('setup.done.title', { name: name.trim() })}</h1>
          <p className="mt-3 text-lg text-ink-soft">{t('setup.done.body')}</p>
          <Button size="lg" className="mt-10 w-full" onClick={() => navigate('/home')}>
            {t('setup.done.go')}
          </Button>
        </div>
      )}
    </StudentScreen>
  );
}

function StepBody({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="mt-2 text-lg text-ink-soft">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}
