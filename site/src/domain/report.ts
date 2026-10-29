import { fmtDate, fmtTime } from "./format";
import { MOVES, roundResult } from "./moves";
import type { Match, Player, PlayerId } from "./types";

/** Le nom du formulaire d'issue, dans .github/ISSUE_TEMPLATE/ */
export const ISSUE_TEMPLATE = "erreur-duel.yml";

/** Lien YouTube calé sur le début de l'extrait. */
export function youtubeUrl(m: Match): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(m.video.id)}${m.start != null ? `&t=${m.start}s` : ""}`;
}

/** Le formulaire d'issue vierge, pour un chifoumi manquant ou une remarque générale. */
export function newIssueUrl(repo: string): string {
  return `https://github.com/${repo}/issues/new?template=${ISSUE_TEMPLATE}`;
}

/** Ce que le site affiche pour ce duel, en texte, pour que la personne n'ait pas à le recopier. */
export function describeMatch(m: Match, players: Record<PlayerId, Player>): string {
  const rounds = m.rounds.map((r, i) => {
    const res = roundResult(r);
    return `Manche ${i + 1} : ${players.a.name} ${MOVES[r.a].label.toLowerCase()}, ${players.b.name} ${MOVES[
      r.b
    ].label.toLowerCase()} → ${res ? players[res].name : "égalité"}`;
  });
  const result = m.winner ? `Victoire de ${players[m.winner].name}` : "Pas de vainqueur";
  return [`${m.car} — ${fmtDate(m.date)}`, ...rounds, result].join("\n");
}

/** Le formulaire d'issue pré-rempli avec la vidéo, les timestamps et le duel tel qu'affiché. */
export function reportIssueUrl(repo: string, m: Match, players: Record<PlayerId, Player>): string {
  const params = new URLSearchParams({
    template: ISSUE_TEMPLATE,
    title: `[Erreur] ${m.car} — ${fmtDate(m.date)}`,
    video: youtubeUrl(m),
    debut: fmtTime(m.start),
    fin: fmtTime(m.end),
    duel: m.id,
    actuel: describeMatch(m, players),
  });
  return `https://github.com/${repo}/issues/new?${params}`;
}
