import type { Move, RawMatch, Round } from "../domain/types";

let n = 0;
/** Un duel minimal valide ; `rounds` en notation courte : "pc" = a pierre, b ciseaux. */
export function rawMatch(rounds: string, over: Partial<RawMatch> = {}): RawMatch {
  n++;
  return {
    id: `m${n}`,
    date: "2024-01-01",
    car: "Voiture",
    video: { id: "vid", start: "1:00", title: "Essai" },
    rounds: rounds.split(",").map(round),
    ...over,
  };
}

const MOVE: Record<string, Move> = { p: "pierre", f: "feuille", c: "ciseaux" };
export const round = (s: string): Round => ({ a: MOVE[s[0]!]!, b: MOVE[s[1]!]! });
