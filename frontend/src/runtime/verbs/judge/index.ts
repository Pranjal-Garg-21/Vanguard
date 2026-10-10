/**
 * Verb: judge. A message, call or screen appears and the student labels it
 * Legit / Suspicious / Scam, using the Scam Lens to find the red flags.
 * Returns a MiniGameResult with one choice per item. Owner: P5.
 */
import { PhoneRoom, type PhoneRoomProps } from '@/games/safe/phone';

/** Mount with a script whose mode is "judge". */
export const JudgeVerb = (props: PhoneRoomProps) => PhoneRoom(props);
