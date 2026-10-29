import { MOVE_KEYS } from "./moves";
import type { Stats } from "./stats";
import type { Move, MoveCount, PlayerId } from "./types";

/** Les habitudes d'un joueur, tirées des vidéos, pour le faire jouer « à sa manière ». */
export interface BotProfile {
  /** ses coups d'ouverture */
  opening: MoveCount;
  /** tous ses coups */
  moves: MoveCount;
  /** après une égalité, la part des fois où il garde son coup (0 à 1) */
  keepRate: number;
}

export function botProfile(stats: Stats, id: PlayerId): BotProfile {
  const { keep, change } = stats.afterTie[id];
  return {
    opening: stats.opening[id],
    moves: stats.moves[id],
    keepRate: keep + change ? keep / (keep + change) : 1 / 3,
  };
}

/**
 * Tire un coup au hasard, proportionnellement aux comptes. Chaque coup compte au moins pour 1 :
 * un coup jamais vu reste possible (et sans données, le tirage est uniforme).
 */
export function pickWeighted(counts: MoveCount, rand: number, among: readonly Move[] = MOVE_KEYS): Move {
  const weights = among.map((k) => counts[k] + 1);
  let r = rand * weights.reduce((s, w) => s + w, 0);
  for (const [i, k] of among.entries()) {
    r -= weights[i]!;
    if (r < 0) return k;
  }
  return among[among.length - 1]!;
}

/**
 * Le coup du bot. Première manche : selon ses ouvertures. Après une égalité (`previous` = son coup
 * précédent) : il le garde aussi souvent que dans les vidéos, sinon il passe à l'un des deux autres.
 * Ne dépend jamais du coup du joueur : pas de triche.
 */
export function botMove(profile: BotProfile, previous: Move | null, rand: () => number = Math.random): Move {
  if (!previous) return pickWeighted(profile.opening, rand());
  if (rand() < profile.keepRate) return previous;
  return pickWeighted(
    profile.moves,
    rand(),
    MOVE_KEYS.filter((k) => k !== previous),
  );
}
