import rawData from "../data/shifumi.json";
import { prepareMatches } from "../domain/matches";
import { computeStats, computeStreaks, cumulativeWins } from "../domain/stats";
import type { Match, Player, PlayerId, ShifumiData } from "../domain/types";

/** Couleur et libellé d'un duel nul, à côté des deux joueurs. */
export const DRAW = { name: "Nul", color: "#8a9aad" } as const;

/**
 * Les données du site et tout ce qui en découle. Les données sont figées au build,
 * donc tout est calculé une seule fois et partagé par les composants.
 */
export function createShifumi(data: ShifumiData) {
  const [a, b] = data.players;
  const players: Record<PlayerId, Player> = { a, b };
  const matches = prepareMatches(data.matches);
  return {
    players,
    matches,
    stats: computeStats(matches),
    streaks: computeStreaks(matches),
    cumulative: cumulativeWins(matches),
    /** le joueur gagnant, ou DRAW pour un duel nul */
    winnerOf: (m: Match): Player | typeof DRAW => (m.winner ? players[m.winner] : DRAW),
    findMatch: (id: string): Match | undefined => matches.find((m) => m.id === id),
  };
}

export type Shifumi = ReturnType<typeof createShifumi>;

let shared: Shifumi | undefined;

export function useShifumi(): Shifumi {
  return (shared ??= createShifumi(rawData as ShifumiData));
}
