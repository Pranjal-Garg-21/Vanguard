/**
 * Registers the service worker (the part that saves the app on the phone) and
 * listens for the install prompt. Owner: P5.
 */
import { registerSW } from 'virtual:pwa-register';
import { initPwaState, usePwa } from './state';

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let deferred: InstallPromptEvent | null = null;
let updateSW: ((reload?: boolean) => Promise<void>) | null = null;
let started = false;

export function startPwa(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  initPwaState();

  window.addEventListener('online', () => usePwa.setState({ online: true }));
  window.addEventListener('offline', () => usePwa.setState({ online: false }));
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep it so we can show it from our own button
    deferred = e as InstallPromptEvent;
    usePwa.setState({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    usePwa.setState({ canInstall: false, installed: true, iosHint: false });
  });

  updateSW = registerSW({
    onNeedRefresh: () => usePwa.setState({ needRefresh: true }),
    onOfflineReady: () => usePwa.setState({ offlineReady: true }),
  });
}

/** Shows the browser's install prompt. */
export async function installApp(): Promise<void> {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  usePwa.setState({ canInstall: false });
}

/** Loads the new version. */
export function applyUpdate(): void {
  void updateSW?.(true);
}
