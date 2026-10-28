import { counterOf, favoriteMove, other } from "./moves";
import { pct } from "./format";
import type { Stats } from "./stats";
import type { Move, PlayerId } from "./types";

export interface CoachAdvice {
  /** le joueur à battre */
  target: PlayerId;
  /** celui qui reçoit le conseil */
  opponent: PlayerId;
  /** coup d'ouverture préféré de la cible, et à quelle fréquence */
  favorite: Move;
  favoriteRate: number;
  /** le coup à jouer en ouverture pour la battre */
  counter: Move;
  /** après une égalité : garde-t-elle son coup ? null sans données */
  afterTie: { keeps: boolean; rate: number } | null;
}

/** Conseils pour battre `target`, tirés de ses habitudes (à prendre au second degré). */
export function coachAdvice(stats: Stats, target: PlayerId): CoachAdvice {
  const favorite = favoriteMove(stats.opening[target]);
  const { keep, change } = stats.afterTie[target];
  const keepRate = pct(keep, keep + change);
  return {
    target,
    opponent: other(target),
    favorite,
    favoriteRate: pct(stats.opening[target][favorite], stats.total),
    counter: counterOf(favorite),
    afterTie:
      keep + change
        ? keepRate >= 50
          ? { keeps: true, rate: keepRate }
          : { keeps: false, rate: 100 - keepRate }
        : null,
  };
}
