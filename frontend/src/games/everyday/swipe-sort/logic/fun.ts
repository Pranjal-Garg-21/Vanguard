/**
 * Detecting `fun_is_bad`. Pure. Owner: P3.
 *
 * This misconception is invisible card-by-card: calling a movie ticket a want
 * is correct. It only exists as a pattern across a whole round — the student
 * who has learned "spending on myself is wrong" rather than "spending has a
 * budget". So no single card can carry it, and the game has to watch for it.
 */

/** Cards whose honest answer is "a want, and that is fine". */
export const FUN_CARDS = new Set([
  'biryani_friends',
  'movie_ticket',
  'fest_ticket',
  'birthday_gift',
  'festival_clothes',
]);

export type FunRecord = {
  card: { id: string };
  bucketId: string;
  correct: boolean | undefined;
};

/**
 * Only flagged when the student had several chances to show balance and took
 * none of them: at least three fun cards seen, at least one of them genuinely
 * ambiguous, and every one pushed to "want".
 */
export function detectFunIsBad(records: readonly FunRecord[]): boolean {
  const funSeen = records.filter((r) => FUN_CARDS.has(r.card.id));
  if (funSeen.length < 3) return false;
  const ambiguousFun = funSeen.filter((r) => r.correct === undefined);
  if (ambiguousFun.length === 0) return false;
  return funSeen.every((r) => r.bucketId === 'want');
}
