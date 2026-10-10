/**
 * Shared fake phone for the Stay Safe games. Scams are JSON scripts in
 * content/scenarios/safe; the runner in logic/ plays them; the components
 * here draw the phone. Owner: P5
 *
 *   PhoneRoom      full play-through (brief, play, replay, summary): Judge and Act in-situ use it
 *   SingleMessage  one scam moment inside a LifePath month
 *   PhoneLab       dev gallery at /dev/phone
 */
export { PhoneRoom, type PhoneRoomProps } from './PhoneRoom';
export { SingleMessage } from './SingleMessage';
export { PhoneLab } from './PhoneLab';
export { PhoneShell } from './PhoneShell';
export { getScenario, listScenarios } from './scenarios';
export { scoreRun, summarise } from './logic/scoring';
export type { Scenario } from './logic/types';
