/**
 * Where to send a player who needs more practice on a money idea: a lesson that teaches it, a simulation that
 * tests it, or a mini game that drills it. Built from what the lessons, simulators and games declare about
 * themselves, plus a short list for the scam-related ideas the simulators do not name directly.
 */
import { everydayGames } from '@/games/everyday';
import { allRooms } from '@/games/investing/lessons/logic/content';
import { lessonTitle } from '@/games/investing/lessons/LessonGrid';
import { SIMULATORS } from '@/games/safe/catalog';

export type LearnLink = { kind: 'lesson' | 'simulation' | 'minigame'; to: string; label?: string };

/** Ideas that belong to a simulator or an investing game but are not listed in its catalogue entry. */
const SIMULATION_FOR: Record<string, string> = {
  loan_app_trap: '/safe/loan',
  impersonation: '/safe/call',
  fake_support: '/safe/call',
  phishing: '/safe/inbox',
  job_scam: '/safe/inbox',
  pin_secrecy: '/safe/upi',
  identity_protection: '/safe/hunter',
  fraud_recovery: '/safe/rescue',
  ponzi: '/learn/invest/invest-or-scam',
  too_good_to_be_true: '/learn/invest/invest-or-scam',
  tips_rumours: '/learn/invest/invest-or-scam',
  risk_return: '/learn/invest/time-machine',
  stocks: '/learn/invest/stock-market',
  mutual_funds: '/learn/invest/mutual-fund',
  sip: '/learn/invest/mutual-fund',
};

export function learnLinks(concept: string): LearnLink[] {
  const links: LearnLink[] = [];

  const lesson = allRooms.find((r) => r.concepts.includes(concept));
  if (lesson) links.push({ kind: 'lesson', to: `/learn/${lesson.pillar}/${lesson.id}`, label: lessonTitle(lesson) });

  const simulator = SIMULATORS.find((s) => s.entries.some((e) => e.concept === concept));
  const simulation = simulator ? `/safe/${simulator.id}` : SIMULATION_FOR[concept];
  if (simulation) links.push({ kind: 'simulation', to: simulation });

  if (everydayGames.some((g) => g.concepts.includes(concept as never))) links.push({ kind: 'minigame', to: '/arcade/everyday' });

  // Every idea gets somewhere to go, even one nothing outside the story teaches yet.
  if (links.length === 0) links.push({ kind: 'lesson', to: '/learn' });
  return links;
}
