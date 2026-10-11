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
import { Icon } from './Icon';

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
      <Icon name={playing ? 'volumeOff' : 'volume'} className={playing ? 'h-5 w-5 animate-pulse' : 'h-5 w-5'} />
    </button>
  );
}
