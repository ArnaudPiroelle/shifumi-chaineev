import { isMove, roundResult } from "./moves";
import { toSeconds } from "./format";
import type { Match, RawMatch } from "./types";

/** Problèmes de saisie d'un duel (vide = duel valide). */
export function validateMatch(m: RawMatch): string[] {
  const errors: string[] = [];
  if (!m.id) errors.push("id manquant");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date)) errors.push(`date "${m.date}" au mauvais format (AAAA-MM-JJ)`);
  if (!m.car?.trim()) errors.push("voiture manquante");
  if (!m.video?.id) errors.push("ID YouTube manquant");
  const start = toSeconds(m.video?.start);
  const end = toSeconds(m.video?.end);
  if (start == null || Number.isNaN(start)) errors.push("début de l'extrait invalide");
  if (end != null && (Number.isNaN(end) || (start != null && end <= start))) errors.push("fin de l'extrait invalide");
  if (!m.rounds?.length) errors.push("aucune manche");
  m.rounds?.forEach((r, i) => {
    if (!isMove(r.a) || !isMove(r.b)) errors.push(`manche ${i + 1} : coup inconnu`);
    else if (i < m.rounds.length - 1 && roundResult(r))
      errors.push(`manche ${i + 1} : seule la dernière peut avoir un gagnant`);
  });
  return errors;
}

/** Calcule gagnant, égalités et temps ; écarte (avec un avertissement) les duels mal saisis ; trie par date. */
export function prepareMatches(raw: readonly RawMatch[]): Match[] {
  return raw
    .filter((m) => {
      const errors = validateMatch(m);
      if (errors.length) console.warn(`[shifumi] duel ${m.id} ignoré : ${errors.join(", ")}`);
      return !errors.length;
    })
    .map((m) => {
      const last = m.rounds[m.rounds.length - 1]!;
      return {
        ...m,
        winner: roundResult(last),
        ties: m.rounds.filter((r) => !roundResult(r)).length,
        start: toSeconds(m.video.start),
        end: toSeconds(m.video.end),
      };
    })
    .sort((x, y) => x.date.localeCompare(y.date));
}
