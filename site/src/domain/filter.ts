import type { Match, PlayerId } from "./types";

export interface DuelFilter {
  /** recherche libre dans la voiture, l'enjeu, la note et le titre de la vidéo */
  query: string;
  winner: "all" | "draw" | PlayerId;
  onlyTies: boolean;
}

export const emptyFilter = (): DuelFilter => ({ query: "", winner: "all", onlyTies: false });

/**
 * Les duels qui correspondent au filtre, de la vidéo la plus récente à la plus ancienne ;
 * les duels d'une même vidéo restent dans l'ordre où ils y apparaissent.
 */
export function filterMatches(matches: readonly Match[], f: DuelFilter): Match[] {
  const q = f.query.trim().toLowerCase();
  return matches
    .filter((m) => f.winner === "all" || (f.winner === "draw" ? !m.winner : m.winner === f.winner))
    .filter((m) => !f.onlyTies || m.ties > 0)
    .filter((m) => !q || [m.car, m.stake, m.note, m.video.title].join(" ").toLowerCase().includes(q))
    .sort((x, y) => y.date.localeCompare(x.date) || (x.start ?? 0) - (y.start ?? 0));
}
