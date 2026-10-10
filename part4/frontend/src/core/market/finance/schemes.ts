/** Why "recruit others" schemes must collapse: the numbers grow faster than any town. */

/** People who must join at `level` when every member must bring in `recruits` new people. Level 0 is the founder. */
export function membersAtLevel(recruits: number, level: number): number {
  return Math.pow(recruits, level);
}

/** Everyone in the scheme from level 0 up to and including `level`. */
export function membersTotal(recruits: number, level: number): number {
  if (recruits === 1) return level + 1;
  return (Math.pow(recruits, level + 1) - 1) / (recruits - 1);
}
