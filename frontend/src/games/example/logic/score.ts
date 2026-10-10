/** Pure logic lives in logic/: no React, no platform, easy to test. */
export function scoreAnswer(choiceId: string, correctId: string): boolean {
  return choiceId === correctId;
}
