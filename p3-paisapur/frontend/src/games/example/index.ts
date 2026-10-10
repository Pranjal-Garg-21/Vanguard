/**
 * Template game. Copy this folder to start a new mini-game.
 * Owner: P5 (scaffold). Delete once real games are registered.
 *
 * Every game folder has the same shape:
 *   index.ts        exports the MiniGame (this file)
 *   ExampleGame.tsx top-level component the runtime mounts (add when P2's runtime lands)
 *   components/     screens used only by this game
 *   logic/          pure logic, no React or platform imports, with tests
 */
import type { MiniGame } from '@/core/types';
import { scoreAnswer } from './logic/score';

export const exampleGame: MiniGame = {
  id: 'example',
  verbs: ['choose'],
  concepts: ['example_concept'],
  levels: [1],
  async play() {
    const correct = scoreAnswer('a', 'a');
    return {
      choices: [{ stepId: 'only', choiceId: 'a', correct, ms: 0 }],
      conceptDeltas: { example_concept: correct ? 1 : 0 },
      misconceptions: [],
      summaryKey: 'example.summary',
    };
  },
};
