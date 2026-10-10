/**
 * "Read this to me". Owner: P3 (P4 owns how it looks).
 *
 * Pressing it always speaks, whether or not the student ticked "Read things
 * aloud": the setting controls what the app does on its own, not what the
 * student asks for. Pressing it again stops.
 *
 * Give it `keys` for text that lives in the string files, which is almost
 * everything. A message body is several keys because the Scam Lens points at
 * parts of it, and those parts are not sentences, so they are read as one.
 */
import { speak, speakKeys, stopSpeaking, t, useSpeaking, type TVars } from '@/platform';

type Props = {
  /** Read as one sentence, in order. */
  keys?: string[];
  /** Text that is not in the string files (a sender's name, a running total). */
  text?: string;
  vars?: TVars;
  /** Names a recording of the whole message, if one exists. */
  clipKey?: string;
  className?: string;
  /** 'inline' sits next to a heading; 'solid' is a button in its own right. */
  tone?: 'inline' | 'solid';
};

export function AudioButton({ keys, text, vars, clipKey, className = '', tone = 'inline' }: Props) {
  const id = clipKey ?? (keys ? keys.join('|') : (text ?? '').trim());
  const playing = useSpeaking() === id && id !== '';
  if (!id) return null;

  const press = () => {
    if (playing) {
      stopSpeaking();
      return;
    }
    if (keys) void speakKeys(keys, vars, clipKey);
    else void speak(text ?? '', { id, clipKey });
  };

  const look =
    tone === 'solid'
      ? 'border border-current/30 bg-current/10'
      : 'border border-transparent hover:border-current/20';

  return (
    <button
      type="button"
      onClick={press}
      aria-label={t(playing ? 'readaloud.stop' : 'readaloud.play')}
      aria-pressed={playing}
      title={t(playing ? 'readaloud.stop' : 'readaloud.play')}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${look} ${className}`}
    >
      <Speaker playing={playing} />
    </button>
  );
}

/** A speaker, with waves while it is reading and a cross when it is not. */
function Speaker({ playing }: { playing: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
      {playing ? (
        <>
          <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />
          <path d="M17.8 7a7 7 0 0 1 0 10" className="animate-pulse" />
        </>
      ) : (
        <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />
      )}
    </svg>
  );
}
