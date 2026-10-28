import type { Match, PlayerId } from "./types";

export interface DuelFilter {
  /** recherche libre dans la voiture, l'enjeu, la note et le titre de la vidéo */
  query: string;
  winner: "all" | "draw" | PlayerId;
  onlyTies: boolean;
}

export const emptyFilter = (): DuelFilter => ({ query: "", winner: "all", onlyTies: false });

/** Les duels qui correspondent au filtre, du plus récent au plus ancien. */
export function filterMatches(matches: readonly Match[], f: DuelFilter): Match[] {
  const q = f.query.trim().toLowerCase();
  return matches
    .filter((m) => f.winner === "all" || (f.winner === "draw" ? !m.winner : m.winner === f.winner))
    .filter((m) => !f.onlyTies || m.ties > 0)
    .filter((m) => !q || [m.car, m.stake, m.note, m.video.title].join(" ").toLowerCase().includes(q))
    .reverse();
}
