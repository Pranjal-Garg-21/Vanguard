/** Reading aloud: the setting is obeyed, one voice at a time, nothing silent. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerStrings, setLanguage } from '../i18n';
import { useActiveProfile } from '../profiles';
import {
  audioEnabled,
  autoSpeakKey,
  hasAudio,
  joinKeys,
  noteUserGesture,
  nowSpeaking,
  onAudioNotice,
  registerAudioManifest,
  resetAudio,
  setClipPlayer,
  setSpeechEngine,
  speak,
  speakKey,
  speakKeys,
  stopSpeaking,
  type AudioNotice,
  type SpeechEngine,
} from './index';
import type { Language } from '../i18n';

/** A phone with voices for the languages named, and a record of what it said. */
function fakePhone(langs: string[] = ['en-IN', 'hi-IN']) {
  const said: Array<{ text: string; lang: string }> = [];
  let finish: (() => void) | null = null;
  const engine: SpeechEngine = {
    voices: () => langs.map((lang) => ({ lang })),
    speak: (text, lang) =>
      new Promise<void>((resolve) => {
        said.push({ text, lang });
        finish = resolve;
      }),
    cancel: () => {
      finish?.();
      finish = null;
    },
  };
  setSpeechEngine(engine);
  return { said, end: () => finish?.() };
}

/** The voice list arrives asynchronously, so nothing is said in the same tick. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const signedIn = (audio: boolean) =>
  useActiveProfile.setState({
    profile: {
      pid: 'p1',
      displayName: 'Test',
      avatarId: 'a',
      language: 'en',
      a11y: { audio, largeText: false, reduceMotion: false, timersOff: false },
      classCode: null,
      classStatus: 'none',
    },
    loaded: true,
  });

beforeEach(() => {
  registerStrings('en', {
    'safe.wt.chat.a': 'I sent money to your number by mistake. ',
    'safe.wt.chat.b': 'Please send it back ',
    'safe.wt.chat.c': 'right now.',
    'safe.wt.amount': 'They say {amount} arrived.',
    'safe.ui.ok': 'Got it',
  });
  setLanguage('en');
  resetAudio();
  noteUserGesture();
  useActiveProfile.setState({ profile: null, loaded: true });
});

afterEach(() => {
  resetAudio();
});

describe('what gets spoken', () => {
  it('joins a message that was split for the Scam Lens into one sentence', () => {
    expect(joinKeys(['safe.wt.chat.a', 'safe.wt.chat.b', 'safe.wt.chat.c'])).toBe(
      'I sent money to your number by mistake. Please send it back right now.',
    );
  });

  it('speaks a key in the current language', async () => {
    const phone = fakePhone();
    const reading = speakKey('safe.ui.ok');
    await tick();
    expect(phone.said).toEqual([{ text: 'Got it', lang: 'en-IN' }]);
    expect(nowSpeaking()).toBe('safe.ui.ok');
    phone.end();
    await reading;
    expect(nowSpeaking()).toBeNull();
  });

  it('fills in names and amounts before speaking them', async () => {
    const phone = fakePhone();
    const reading = speakKey('safe.wt.amount', { amount: '₹2,000' });
    await tick();
    expect(phone.said[0]?.text).toBe('They say ₹2,000 arrived.');
    phone.end();
    await reading;
  });

  it('uses the language the student chose', async () => {
    registerStrings('hi', { 'safe.ui.ok': 'ठीक है' });
    setLanguage('hi');
    const phone = fakePhone();
    const reading = speakKey('safe.ui.ok');
    await tick();
    expect(phone.said[0]).toEqual({ text: 'ठीक है', lang: 'hi-IN' });
    phone.end();
    await reading;
    setLanguage('en');
  });
});

describe('one voice at a time', () => {
  it('stops the old message when a new one starts', async () => {
    const phone = fakePhone();
    const first = speakKey('safe.wt.chat.c');
    await tick();
    const second = speakKey('safe.ui.ok');
    await first;
    await tick();
    expect(phone.said.map((s) => s.text)).toEqual(['right now.', 'Got it']);
    expect(nowSpeaking()).toBe('safe.ui.ok');
    phone.end();
    await second;
  });

  it('stops when the screen closes', async () => {
    const phone = fakePhone();
    const reading = speakKey('safe.ui.ok');
    await tick();
    expect(nowSpeaking()).not.toBeNull();
    stopSpeaking();
    await reading;
    expect(nowSpeaking()).toBeNull();
    expect(phone.said).toHaveLength(1);
  });
});

describe('the "Read things aloud" setting', () => {
  it('is off for a student who did not tick it, and for nobody signed in', () => {
    expect(audioEnabled()).toBe(false);
    signedIn(false);
    expect(audioEnabled()).toBe(false);
    signedIn(true);
    expect(audioEnabled()).toBe(true);
  });

  it('never reads a screen by itself unless the student asked for it', async () => {
    const phone = fakePhone();
    signedIn(false);
    autoSpeakKey('safe.ui.ok');
    await tick();
    expect(phone.said).toHaveLength(0);

    signedIn(true);
    autoSpeakKey('safe.ui.ok');
    await tick();
    expect(phone.said).toHaveLength(1);
  });

  it('still speaks when the student presses the button themselves', async () => {
    const phone = fakePhone();
    signedIn(false);
    const reading = speakKey('safe.ui.ok');
    await tick();
    expect(phone.said).toHaveLength(1);
    phone.end();
    await reading;
  });
});

describe('recordings', () => {
  it('plays a recording when there is one, and speaks when there is not', async () => {
    const played: string[] = [];
    setClipPlayer((url) => ({ play: async () => void played.push(url), stop: () => {} }));
    const phone = fakePhone();
    registerAudioManifest('en', { 'safe.ui.ok': 'safe/ui/ok.mp3' });

    expect(hasAudio('safe.ui.ok')).toBe(true);
    expect(hasAudio('safe.wt.chat.c')).toBe(false);

    await speakKey('safe.ui.ok');
    expect(played).toEqual(['/audio/en/safe/ui/ok.mp3']);
    expect(phone.said).toHaveLength(0);

    const reading = speakKey('safe.wt.chat.c');
    await tick();
    expect(phone.said).toHaveLength(1);
    phone.end();
    await reading;
  });

  it('speaks text with a placeholder rather than playing a stale recording', async () => {
    const played: string[] = [];
    setClipPlayer((url) => ({ play: async () => void played.push(url), stop: () => {} }));
    const phone = fakePhone();
    registerAudioManifest('en', { 'safe.wt.amount': 'safe/wt/amount.mp3' });

    const reading = speakKey('safe.wt.amount', { amount: '₹2,000' });
    await tick();
    expect(played).toEqual([]);
    expect(phone.said[0]?.text).toContain('₹2,000');
    phone.end();
    await reading;
  });

  it('records a whole message, never its fragments', async () => {
    const played: string[] = [];
    setClipPlayer((url) => ({ play: async () => void played.push(url), stop: () => {} }));
    fakePhone();
    registerAudioManifest('en', { 'safe.wt.chat': 'safe/wt/chat.mp3' });

    await speakKeys(['safe.wt.chat.a', 'safe.wt.chat.b', 'safe.wt.chat.c'], {}, 'safe.wt.chat');
    expect(played).toEqual(['/audio/en/safe/wt/chat.mp3']);
  });
});

describe('a phone with no voice for the language', () => {
  it('says so once instead of failing silently', async () => {
    const seen: Array<[AudioNotice, Language]> = [];
    onAudioNotice((notice, language) => seen.push([notice, language]));
    registerStrings('te', { 'safe.ui.ok': 'సరే' });
    setLanguage('te');
    const phone = fakePhone(['en-IN', 'hi-IN']); // no Telugu voice

    await speakKey('safe.ui.ok');
    await speakKey('safe.ui.ok');

    expect(phone.said).toHaveLength(0);
    expect(seen).toEqual([['no-voice', 'te']]);
    expect(nowSpeaking()).toBeNull();
    setLanguage('en');
  });

  it('does not break the screen when the browser cannot speak at all', async () => {
    setSpeechEngine(null);
    await expect(speak('anything')).resolves.toBeUndefined();
    expect(nowSpeaking()).toBeNull();
  });
});
