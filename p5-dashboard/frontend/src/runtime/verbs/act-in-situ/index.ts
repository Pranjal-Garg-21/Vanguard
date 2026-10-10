/**
 * Verb: act-in-situ. The student uses the phone normally (opens the link,
 * enters the PIN), money moves in the simulation, and a post-mortem replays
 * what happened. Returns a MiniGameResult; effects are included only in
 * LifePath mode. Owner: P5.
 */
import { PhoneRoom, type PhoneRoomProps } from '@/games/safe/phone';

/** Mount with a script whose mode is "act". */
export const ActInSituVerb = (props: PhoneRoomProps) => PhoneRoom(props);
