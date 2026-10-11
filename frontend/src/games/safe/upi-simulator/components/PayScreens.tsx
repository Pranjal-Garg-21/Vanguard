/** The Pay app screens used before the scams start: link account, set PIN, scan a QR, pay, receipt. */
import { useState } from 'react';
import { t } from '@/platform';
import { Button, Icon } from '@/ui';
import { rupees } from '../../phone/apps/PayApp';
import { CANTEEN_AMOUNT, MAX_PIN_TRIES } from '../logic/flow';
import { PinPad } from './PinPad';

const Screen = ({ children }: { children: React.ReactNode }) => <div className="flex h-full flex-col p-4 text-phone-ink">{children}</div>;

export function LinkAccountScreen({ onLink }: { onLink: () => void }) {
  return (
    <Screen>
      <h2 className="text-lg font-bold">{t('safe.upi.link.title')}</h2>
      <p className="mt-1 text-sm text-phone-muted">{t('safe.upi.link.body')}</p>
      <div className="mt-5 flex items-center gap-3 rounded-xl bg-phone-card p-4 shadow-sm">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700"><Icon name="wallet" /></span>
        <div>
          <p className="font-semibold">{t('safe.upi.link.account')}</p>
          <p className="font-mono text-sm text-phone-muted">{t('safe.upi.link.number')}</p>
        </div>
      </div>
      <Button className="mt-auto w-full" onClick={onLink}>{t('safe.upi.link.cta')}</Button>
    </Screen>
  );
}

export function SetPinScreen({ message, onSubmit }: { message: string | null; onSubmit: (pin: string, covered: boolean) => void }) {
  return <PinPad title={t('safe.upi.pin.setTitle')} help={t('safe.upi.pin.setHelp')} error={message === 'weak' ? t('safe.upi.pin.weak') : null} onSubmit={onSubmit} />;
}

export function PayScanScreen({ message, onProceed }: { message: string | null; onProceed: () => void }) {
  const [scanned, setScanned] = useState(false);
  return (
    <Screen>
      <h2 className="text-lg font-bold">{t('safe.upi.scan.title')}</h2>
      {message === 'locked' && <p role="alert" className="mt-2 text-sm font-medium text-bad">{t('safe.upi.pin.locked')}</p>}
      {!scanned ? (
        <>
          <p className="mt-1 text-sm text-phone-muted">{t('safe.upi.scan.help')}</p>
          <div className="mt-4 flex flex-1 items-center justify-center rounded-2xl bg-slate-900">
            <div className="relative flex h-44 w-44 items-center justify-center rounded-xl border-2 border-dashed border-brand text-slate-300">
              <Icon name="qr" className="h-24 w-24" />
              <Icon name="camera" className="absolute -bottom-3 end-3 h-6 w-6 rounded bg-slate-900 text-brand" />
            </div>
          </div>
          <Button className="mt-4 w-full" onClick={() => setScanned(true)}>{t('safe.upi.scan.cta')}</Button>
        </>
      ) : (
        <>
          <div className="mt-5 rounded-2xl bg-phone-card p-5 text-center shadow-md">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700"><Icon name="rupee" /></span>
            <p className="mt-3 font-semibold">{t('safe.upi.scan.payee')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{rupees(CANTEEN_AMOUNT)}</p>
            <p className="mt-1 text-xs text-phone-muted">{t('safe.upi.scan.amount', { amount: CANTEEN_AMOUNT })}</p>
          </div>
          <Button className="mt-auto w-full" onClick={onProceed}>{t('safe.upi.scan.proceed')}</Button>
        </>
      )}
    </Screen>
  );
}

export function PayPinScreen({ message, tries, onSubmit }: { message: string | null; tries: number; onSubmit: (pin: string, covered: boolean) => void }) {
  const error = message === 'wrong' ? t('safe.upi.pin.wrong', { n: MAX_PIN_TRIES - tries }) : null;
  return <PinPad title={t('safe.upi.pin.enterTitle')} help={t('safe.upi.pin.enterHelp')} error={error} onSubmit={onSubmit} />;
}

export function PaidScreen({ balance, onNext }: { balance: number; onNext: () => void }) {
  return (
    <Screen>
      <div className="mt-6 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="check" className="h-8 w-8" /></span>
        <h2 className="mt-4 text-xl font-bold">{t('safe.upi.paid.title')}</h2>
        <p className="mt-1 text-sm text-phone-muted">{t('safe.upi.paid.body', { amount: CANTEEN_AMOUNT })}</p>
        <p className="mt-5 text-xs font-bold uppercase tracking-wider text-phone-muted">{t('safe.upi.paid.balance')}</p>
        <p className="text-3xl font-bold tabular-nums">{rupees(balance)}</p>
      </div>
      <Button className="mt-auto w-full" onClick={onNext}>{t('safe.upi.paid.cta')}</Button>
    </Screen>
  );
}
