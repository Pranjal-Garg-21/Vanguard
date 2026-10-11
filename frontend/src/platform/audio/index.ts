/**
 * Reading the screen aloud, for students who read slowly or not at all.
 * Owner: P3.
 *
 * Hybrid by design. A key with a recording plays the recording; everything
 * else is spoken by the phone's own voice. Nothing is ever silent, and the two
 * can be mixed as recordings arrive, one key at a time.
 *
 * Recordings are not in git. They are fetched from /audio/<language>/, listed
 * by a manifest downloaded with a language pack, and kept by the service
 * worker (see vite.config.ts), so a phone that has heard a clip once can hear
 * it again offline.
 *
 * Two rules run through everything here:
 *
 * - Nothing speaks by itself unless the student ticked "Read things aloud".
 *   `speak*` is a student pressing a button, so it always speaks; `autoSpeak*`
 *   is the app offering, so it checks the setting first.
 * - Only one thing speaks at a time, and leaving a screen stops it. Two voices
 *   over each other are worse than no voice at all.
 */
import { accessibility } from '../a11y';
import { getLanguage, t, type Language, type TVars } from '../i18n';

/** What the Web Speech API calls each language. */
const VOICE_TAG: Record<Language, string> = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN', ur: 'ur-PK' };

/** The part of the browser this module needs, so tests can stand in for it. */
export type SpeechEngine = {
  voices(): Array<{ lang: string }>;
  /** Resolves when the phrase has been read, or immediately if it was cut off. */
  speak(text: string, lang: string): Promise<void>;
  cancel(): void;
};

export type AudioClip = { play(): Promise<void>; stop(): void };

// ---------------------------------------------------------------------------
// The browser

/** The best installed voice for a language tag: the exact region, then the same language, preferring voices the phone itself provides. */
function pickVoice(voices: SpeechSynthesisVoice[], tag: string): SpeechSynthesisVoice | undefined {
  const same = voices.filter((v) => sameLanguage(v.lang, tag));
  const rank = (v: SpeechSynthesisVoice) => (v.lang.toLowerCase().replace('_', '-') === tag.toLowerCase() ? 0 : 2) + (v.localService ? 0 : 1);
  return [...same].sort((a, b) => rank(a) - rank(b))[0];
}

function browserSpeech(): SpeechEngine | null {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth) return null;
  return {
    voices: () => synth.getVoices(),
    speak: (text, lang) =>
      new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        // Naming the voice matters: with only a language tag, some browsers fall back to the system's default
        // voice when there is no exact regional match, and that can be a voice for a different language
        // (on Linux, a Japanese one), which comes out as noise rather than words.
        const voice = pickVoice(synth.getVoices(), lang);
        if (voice) utterance.voice = voice;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        synth.speak(utterance);
      }),
    cancel: () => synth.cancel(),
  };
}

let engine: SpeechEngine | null | undefined;

function speech(): SpeechEngine | null {
  if (engine === undefined) engine = browserSpeech();
  return engine;
}

/** Tests and, later, a recorded-voice backend. */
export function setSpeechEngine(next: SpeechEngine | null): void {
  engine = next;
}

/**
 * True when there is any way to read text aloud. A screen can hide its speaker
 * button rather than show a dead one; a missing voice for one language is a
 * different thing, and is reported through onAudioNotice instead.
 */
export function canSpeak(): boolean {
  return speech() !== null;
}

/**
 * The voice list arrives asynchronously on most browsers, and is empty on the
 * first call after a cold start.
 */
async function voicesReady(): Promise<Array<{ lang: string }>> {
  const api = speech();
  if (!api) return [];
  const found = api.voices();
  if (found.length > 0) return found;
  if (typeof window === 'undefined' || !window.speechSynthesis) return found;
  await new Promise<void>((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', done);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, 1_000);
    window.speechSynthesis.addEventListener('voiceschanged', done);
  });
  return api.voices();
}

/** 'te-IN' matches a 'te' or 'te-IN' voice, but not 'ta-IN'. */
const sameLanguage = (voice: string, want: string) => voice.toLowerCase().split('-')[0] === want.toLowerCase().split('-')[0];

// ---------------------------------------------------------------------------
// Recordings

type Manifest = { files: Record<string, string> };

const manifests = new Map<Language, Manifest>();

/**
 * Tells the app which keys have a recording in a language. Called by the
 * language-pack download; also usable from a test or a dev build.
 */
export function registerAudioManifest(language: Language, files: Record<string, string>): void {
  manifests.set(language, { files: { ...manifests.get(language)?.files, ...files } });
}

/** Whether a key has a recording, so a caller can prefer it over the phone's voice. */
export function hasAudio(key: string, language: Language = getLanguage()): boolean {
  return manifests.get(language)?.files[key] !== undefined;
}

function clipUrl(key: string, language: Language): string | null {
  const file = manifests.get(language)?.files[key];
  return file ? `/audio/${language}/${file}` : null;
}

/**
 * Downloads the list of recordings for a language. Missing is normal and not
 * an error: the phone's own voice reads everything instead.
 */
export async function loadAudioManifest(language: Language): Promise<boolean> {
  if (manifests.has(language)) return true;
  try {
    const response = await fetch(`/audio/${language}/manifest.json`);
    if (!response.ok) return false;
    const files = (await response.json()) as Record<string, string>;
    registerAudioManifest(language, files);
    return true;
  } catch {
    return false;
  }
}

const defaultClipPlayer = (url: string): AudioClip => {
  const element = new Audio(url);
  return {
    play: () =>
      new Promise<void>((resolve) => {
        element.onended = () => resolve();
        element.onerror = () => resolve();
        void element.play().catch(() => resolve());
      }),
    stop: () => {
      element.pause();
      element.currentTime = 0;
    },
  };
};

let playClip = defaultClipPlayer;

/** Tests stand in for the audio element. `null` puts the real one back. */
export function setClipPlayer(next: ((url: string) => AudioClip) | null): void {
  playClip = next ?? defaultClipPlayer;
}

// ---------------------------------------------------------------------------
// What is speaking now

let speakingId: string | null = null;
let currentClip: AudioClip | null = null;
let run = 0;
const listeners = new Set<() => void>();

function announce(id: string | null) {
  speakingId = id;
  for (const listener of listeners) listener();
}

/** The id passed to the last `speak*` call, while it is still being read. */
export function nowSpeaking(): string | null {
  return speakingId;
}

export function subscribeToSpeech(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Always call this when a screen closes. Two voices at once help nobody. */
export function stopSpeaking(): void {
  run += 1;
  currentClip?.stop();
  currentClip = null;
  speech()?.cancel();
  if (speakingId !== null) announce(null);
}

// ---------------------------------------------------------------------------
// Notices

/**
 * Browsers refuse to make a sound until the student has tapped something, so
 * automatic reading waits for the first tap. Setup and the room start button
 * are both taps, so in practice this costs nothing.
 */
let tapped = false;

export type AudioNotice = 'no-voice';

let noticeHandler: ((notice: AudioNotice, language: Language) => void) | null = null;
const noticed = new Set<Language>();

/**
 * Called once per language when the phone has no voice for it, so a screen can
 * say so rather than appearing to do nothing.
 */
export function onAudioNotice(handler: ((notice: AudioNotice, language: Language) => void) | null): void {
  noticeHandler = handler;
}

/** For tests, and for a student who installs a voice mid-session. */
export function resetAudioNotices(): void {
  noticed.clear();
}

/**
 * Back to a phone nobody has touched: nothing speaking, no recordings known,
 * the real browser again, and automatic reading waiting for the first tap.
 * Used by tests.
 */
export function resetAudio(): void {
  stopSpeaking();
  manifests.clear();
  noticed.clear();
  noticeHandler = null;
  engine = undefined;
  playClip = defaultClipPlayer;
  tapped = false;
}

// ---------------------------------------------------------------------------
// Speaking

export function audioEnabled(): boolean {
  return accessibility().audio;
}

export type SpeakOptions = {
  /** Identifies this reading, for the speaker button's playing state. */
  id?: string;
  /** A recording to prefer over the phone's voice. */
  clipKey?: string;
  language?: Language;
};

/**
 * Reads a sentence. This is the student pressing a speaker button, so it
 * speaks whether or not "Read things aloud" is on.
 */
export async function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  const language = options.language ?? getLanguage();
  const trimmed = text.trim();
  if (!trimmed) return;

  stopSpeaking();
  const mine = run;
  announce(options.id ?? trimmed);

  const url = options.clipKey ? clipUrl(options.clipKey, language) : null;
  if (url) {
    const clip = playClip(url);
    currentClip = clip;
    await clip.play();
    if (run === mine) {
      currentClip = null;
      announce(null);
    }
    return;
  }

  const api = speech();
  const tag = VOICE_TAG[language];
  if (!api) {
    if (run === mine) announce(null);
    return;
  }

  const voices = await voicesReady();
  if (run !== mine) return;
  if (voices.length > 0 && !voices.some((v) => sameLanguage(v.lang, tag))) {
    if (!noticed.has(language)) {
      noticed.add(language);
      noticeHandler?.('no-voice', language);
    }
    announce(null);
    return;
  }

  await api.speak(trimmed, tag);
  if (run === mine) announce(null);
}

/** Reads one string of text. */
export function speakKey(key: string, vars: TVars = {}): Promise<void> {
  return speak(t(key, vars), { id: key, clipKey: hasPlaceholders(key) ? undefined : key });
}

/**
 * Reads several keys as one sentence. A message body is split into segments so
 * the Scam Lens can point at part of it, and the segments are not sentences on
 * their own, so they are joined before anything is spoken.
 *
 * `clipKey` names a recording of the whole message, since a recording per
 * fragment would sound broken.
 */
export function speakKeys(keys: string[], vars: TVars = {}, clipKey?: string): Promise<void> {
  return speak(joinKeys(keys, vars), { id: clipKey ?? keys.join('|'), clipKey: clipFor(keys, clipKey) });
}

/**
 * The recording to use for a message, or nothing when the text is filled in at
 * play time and so cannot have been recorded.
 */
export function clipFor(keys: string[], clipKey?: string): string | undefined {
  return clipKey && !keys.some(hasPlaceholders) ? clipKey : undefined;
}

/** The text of several keys as one sentence, as the student sees it. */
export function joinKeys(keys: string[], vars: TVars = {}): string {
  return keys
    .map((key) => t(key, vars))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A string with a {placeholder} is filled in at play time, so it cannot be a recording. */
function hasPlaceholders(key: string): boolean {
  return /\{[a-zA-Z]/.test(t(key, {}));
}

// ---------------------------------------------------------------------------
// The app offering to read, rather than the student asking

export function noteUserGesture(): void {
  tapped = true;
}

if (typeof document !== 'undefined') {
  const once = () => {
    tapped = true;
    document.removeEventListener('pointerdown', once);
    document.removeEventListener('keydown', once);
  };
  document.addEventListener('pointerdown', once);
  document.addEventListener('keydown', once);
}

/** Reads a screen when it opens, if the student asked for that. */
export function autoSpeakKeys(keys: string[], vars: TVars = {}, clipKey?: string): void {
  autoSpeak(joinKeys(keys, vars), { id: clipKey ?? keys.join('|'), clipKey: clipFor(keys, clipKey) });
}

/** The same, for a sentence that has already been put together. */
export function autoSpeak(text: string, options: SpeakOptions = {}): void {
  if (!audioEnabled() || !tapped) return;
  void speak(text, options);
}

export function autoSpeakKey(key: string, vars: TVars = {}): void {
  if (!audioEnabled() || !tapped) return;
  void speakKey(key, vars);
}
