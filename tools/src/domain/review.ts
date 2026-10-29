import { fmtTime, toSeconds } from "@site/domain/format";
import { MOVES } from "@site/domain/moves";
import type { Move, PlayerId, RawMatch } from "@site/domain/types";

/** Un passage détecté par `npm run detect` (ou ajouté à la main), tel qu'écrit dans candidates.json. */
export interface Candidate {
  /** "<videoId>@<start>" ; "<videoId>@main-<horodatage>" pour un ajout à la main */
  id: string;
  videoId: string;
  title: string | null;
  date: string | null;
  start: number;
  end: number | null;
  score: number;
  keywords: string[];
  snippet: string;
  manual?: boolean;
}

/** Une vidéo où aucun mot-clé n'a été trouvé. */
export interface UndetectedVideo {
  videoId: string;
  title: string | null;
  date: string | null;
  duration: number | null;
  subs: boolean;
}

export interface CandidatesFile {
  generated: string;
  videos: number;
  candidates: Candidate[];
  /** absent des fichiers générés par les anciennes versions de la détection */
  undetected?: UndetectedVideo[];
}

/** todo = à traiter, ok = validé, ko = pas un chifoumi, done = déjà dans shifumi.json */
export type Status = "todo" | "ok" | "ko" | "done";

/** Une manche en cours de saisie : un coup peut manquer. */
export interface DraftRound {
  a: Move | null;
  b: Move | null;
}

/** Les champs modifiables d'un duel. Un temps mal saisi vaut NaN. */
export interface Fields {
  start: number | null;
  end: number | null;
  car: string;
  stake: string;
  note: string;
  rounds: DraftRound[];
}

/** L'état de validation d'un passage. */
export interface Review extends Fields {
  status: Status;
  /** empreinte (fieldsKey) du duel dans shifumi.json la dernière fois qu'on l'a repris */
  base?: string;
  /** modifié ici et dans shifumi.json : pas exporté */
  conflict?: boolean;
}

/** "checked" = vérifiée, rien ; "found" = un chifoumi y a été ajouté à la main */
export type VideoCheck = "checked" | "found";

/** "12:34", "1:02:03", 754 → secondes ; un texte mal formé donne NaN, un champ vide null */
export function parseTime(t: string | number | null | undefined): number | null {
  if (typeof t === "string") {
    t = t.trim();
    if (t && !/^\d+(:\d{1,2}){0,2}$/.test(t)) return NaN;
  }
  return toSeconds(t);
}

/** 754 → "12:34" ; "" pour un temps absent ou invalide */
export const fmt = (s: number | null | undefined): string => (s == null || isNaN(s) ? "" : fmtTime(Math.round(s)));

/** gagnant de la manche, null pour une égalité, undefined si un coup manque */
export function draftResult(r: DraftRound): PlayerId | null | undefined {
  if (!r.a || !r.b) return undefined;
  if (r.a === r.b) return null;
  return MOVES[r.a].beats === r.b ? "a" : "b";
}

const filled = (rounds: DraftRound[]) => rounds.filter((r) => r.a || r.b);

/** La voiture devinée d'après le titre : « Essai Cupra Raval : … » → « Cupra Raval » */
export function guessCar(title: string | null): string {
  const t = title ?? "";
  const m =
    t.match(/(?:essai|test)\s+(?:conso\s+|autonomie\s+)?(.+?)\s*(?::|\(|-|\||$)/i) ??
    t.match(/\ben\s+(.+?)\s*(?::|\(|\?|$)/i);
  return (m?.[1] ?? "").trim();
}

/** le duel publié qui correspond au passage : même vidéo, début à moins de 2 minutes */
export function existingMatch(matches: RawMatch[], c: Candidate): RawMatch | undefined {
  return matches.find((m) => m.video?.id === c.videoId && Math.abs((parseTime(m.video.start) ?? -1e9) - c.start) < 120);
}

/** les champs modifiables d'un duel publié */
export const fieldsOf = (ex: RawMatch, c: Candidate): Fields => ({
  start: parseTime(ex.video.start),
  end: ex.video.end != null ? parseTime(ex.video.end) : c.end,
  car: ex.car || "",
  stake: ex.stake || "",
  note: ex.note || "",
  rounds: ex.rounds.map((r) => ({ a: r.a, b: r.b })),
});

/** empreinte de ces champs, pour savoir qui a changé quoi */
export const fieldsKey = (f: Fields): string =>
  JSON.stringify([
    f.car.trim(),
    f.start,
    f.end ?? null,
    f.stake.trim(),
    f.note.trim(),
    filled(f.rounds).map((r) => [r.a, r.b]),
  ]);

/** L'état de départ d'un passage : un duel déjà publié part de ce qui y est écrit, pour pouvoir le modifier. */
export function initialReview(c: Candidate, matches: RawMatch[]): Review {
  const ex = existingMatch(matches, c);
  if (ex) return { status: "done", ...fieldsOf(ex, c), base: fieldsKey(fieldsOf(ex, c)) };
  return {
    status: "todo",
    start: c.start,
    end: c.end,
    car: guessCar(c.title),
    stake: "",
    note: "",
    rounds: [{ a: null, b: null }],
  };
}

/** duel fini sur une égalité, sans vainqueur */
export function isDraw(f: Fields): boolean {
  const rs = f.rounds.filter((r) => r.a && r.b);
  return rs.length > 0 && draftResult(rs[rs.length - 1]!) === null;
}

/** Ce qui empêche de valider, ou "" */
export function validate(f: Fields): string {
  if (!f.car.trim()) return "Indique la voiture.";
  if (f.start == null || isNaN(f.start)) return "Temps de début invalide.";
  if (f.end != null && (isNaN(f.end) || f.end <= f.start)) return "Temps de fin invalide.";
  const rs = filled(f.rounds);
  if (!rs.length) return "Renseigne au moins une manche.";
  if (rs.some((r) => !r.a || !r.b)) return "Une manche est incomplète.";
  if (rs.slice(0, -1).some((r) => draftResult(r))) return "Seule la dernière manche peut avoir un gagnant.";
  return "";
}

/** Choisit un coup ; une égalité complète en dernière position ouvre automatiquement la manche suivante. */
export function pick(f: Fields, i: number, p: PlayerId, m: Move): void {
  const r = f.rounds[i];
  if (!r) return;
  r[p] = m;
  if (i === f.rounds.length - 1 && draftResult(r) === null) f.rounds.push({ a: null, b: null });
}

/**
 * shifumi.json a pu être modifié à la main depuis la dernière visite : un duel publié qu'on n'a pas
 * touché ici reprend les valeurs du fichier ; s'il a changé des deux côtés, c'est un conflit.
 */
export function syncWithFile(r: Review, c: Candidate, matches: RawMatch[]): void {
  const ex = existingMatch(matches, c);
  // le statut suit le fichier : un passage publié depuis (ailleurs, à la main…) passe en « publié »,
  // un passage retiré du fichier revient « à traiter »
  if (ex && (r.status === "todo" || r.status === "ko")) {
    Object.assign(r, fieldsOf(ex, c));
    r.status = "done";
    r.base = fieldsKey(r);
    delete r.conflict;
    return;
  }
  if (!ex && r.status === "done") {
    r.status = "todo";
    delete r.base;
    delete r.conflict;
    return;
  }
  if (!ex || (r.status !== "done" && r.status !== "ok")) return;
  const file = fieldsKey(fieldsOf(ex, c));
  if (r.base == null && r.status === "ok") r.base = file; // validé ici avant le suivi des modifications
  const untouched = r.base == null || fieldsKey(r) === r.base;
  if (untouched) {
    Object.assign(r, fieldsOf(ex, c));
    r.base = file;
    delete r.conflict;
  } else {
    r.conflict = file !== r.base;
  }
}

/** oublie les modifications faites ici et reprend le duel du fichier */
export function takeFromFile(r: Review, c: Candidate, matches: RawMatch[]): void {
  const ex = existingMatch(matches, c);
  if (!ex) return;
  Object.assign(r, fieldsOf(ex, c));
  r.base = fieldsKey(r);
  delete r.conflict;
}

/** le duel au format de shifumi.json ; un duel déjà présent garde son id, sa date et son titre */
export function entryOf(c: Candidate, r: Review, matches: RawMatch[]): RawMatch {
  const ex = existingMatch(matches, c);
  const e: RawMatch = {
    id: ex ? ex.id : `${c.videoId}-${r.start}`,
    date: ex?.date || c.date || "",
    car: r.car.trim(),
    video: { id: c.videoId, start: fmt(r.start), end: fmt(r.end), title: ex?.video.title || c.title || "" },
    stake: r.stake.trim(),
    // validate() garantit que les manches renseignées sont complètes
    rounds: filled(r.rounds).map((x) => ({ a: x.a!, b: x.b! })),
    note: r.note.trim(),
  };
  if (r.end == null) delete e.video.end;
  if (!e.stake) delete e.stake;
  if (!e.note) delete e.note;
  return e;
}

function sameEntry(e: RawMatch, m: RawMatch): boolean {
  const key = (x: RawMatch) =>
    JSON.stringify([
      x.car || "",
      fmt(parseTime(x.video.start)),
      x.video.end != null ? fmt(parseTime(x.video.end)) : "",
      x.stake || "",
      x.note || "",
      x.rounds.map((r) => [r.a, r.b]),
    ]);
  return key(e) === key(m);
}

/** duel déjà publié et modifié depuis dans la page de validation */
export function isEdited(c: Candidate, r: Review, matches: RawMatch[]): boolean {
  const ex = existingMatch(matches, c);
  return (
    !!ex &&
    (r.status === "done" || r.status === "ok") &&
    !r.conflict &&
    !validate(r) &&
    fieldsKey(r) !== r.base &&
    !sameEntry(entryOf(c, r, matches), ex)
  );
}

export interface ExportItem {
  candidate: Candidate;
  entry: RawMatch;
  /** remplace le duel déjà publié au lieu de l'ajouter */
  replace: boolean;
}

/** Les duels à écrire dans shifumi.json : les nouveaux validés et les publiés modifiés, par date. */
export function toExport(
  candidates: Candidate[],
  reviewOf: (c: Candidate) => Review,
  matches: RawMatch[],
): ExportItem[] {
  const seen = new Set<string>();
  return candidates
    .filter((c) => (reviewOf(c).status === "ok" && !existingMatch(matches, c)) || isEdited(c, reviewOf(c), matches))
    .sort((x, y) => (x.date || "").localeCompare(y.date || "") || x.start - y.start)
    .map((c) => ({ candidate: c, entry: entryOf(c, reviewOf(c), matches), replace: !!existingMatch(matches, c) }))
    .filter(({ entry }) => !seen.has(entry.id) && !!seen.add(entry.id));
}

/** les entrées prêtes à coller dans le tableau "matches" de shifumi.json */
export function exportCode(items: ExportItem[]): string {
  if (!items.length) return "// Aucun duel validé ou modifié pour l'instant.";
  return items.map(({ entry }) => JSON.stringify(entry, null, 2).replace(/^/gm, "    ")).join(",\n");
}

/** Un passage ajouté à la main dans une vidéo sans détection. */
export function manualCandidate(v: UndetectedVideo, now = Date.now()): Candidate {
  return {
    id: `${v.videoId}@main-${now}`,
    videoId: v.videoId,
    title: v.title,
    date: v.date,
    manual: true,
    start: 0,
    end: null,
    score: 0,
    keywords: [],
    snippet: "Ajouté à la main : lance la vidéo, trouve le chifoumi puis cale le début avec 📍.",
  };
}

const HIGHLIGHTED = [
  "shifumi",
  "chifumi",
  "chifoumi",
  "chi fou mi",
  "pierre",
  "feuille",
  "papier",
  "ciseaux",
  "ciseau",
];

/** Découpe le texte pour surligner les mots-clés : les morceaux d'indice impair sont à surligner. */
export function highlight(text: string, keywords: string[]): string[] {
  const words = [...new Set([...HIGHLIGHTED, ...keywords])].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return text.split(new RegExp(`(${words.join("|")})`, "gi"));
}
