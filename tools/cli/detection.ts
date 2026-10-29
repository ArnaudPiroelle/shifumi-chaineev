/** Lecture des sous-titres WebVTT et repérage des chifoumis : la partie pure de `npm run detect`. */

/** un mot du sous-titre et le moment où il est prononcé, en secondes */
export type TimedWord = [time: number, word: string];

export interface Detection {
  start: number;
  end: number;
  score: number;
  keywords: string[];
  snippet: string;
}

// \w et \b au sens Unicode (comme en Python), pas seulement ASCII
const W = String.raw`[\p{L}\p{N}_]`;
const NW = String.raw`[^\p{L}\p{N}_]`;
const B = String.raw`(?<!${W})`; // début de mot
const E = String.raw`(?!${W})`; // fin de mot
const rx = (source: string) => new RegExp(source, "gu");

// Mots-clés, appliqués sur un texte en minuscules et sans accents.
// "fort" = quasi certain d'être un chifoumi ; "coup" = un coup isolé, qui ne compte
// que s'il y en a au moins deux différents dans la même fenêtre.
const STRONG = [
  // shifumi, chifumi, chifoumi, chi fou mi, chifoui
  rx(String.raw`${B}(?:s|c)h?[iy]+[\s-]*f+(?:ou|o|u)+[\s-]*(?:mi+s?|i)${E}`),
  // un coup annoncé ou joué : "je fais pierre", "il a fait ciseaux", "tu joues papier"
  rx(
    String.raw`${B}(?:fai[ts]?|faire|fera[is]?|jou${W}*|sor[st]|sortir)${NW}+(?:(?:les?|la|du|de)${NW}+)?(?:pierre|feuille|papier|ciseaux?)${E}`,
  ),
  rx(String.raw`${B}ciseaux?${E}`), // quasi toujours le chifoumi, même seul
  rx(String.raw`${B}pierre${NW}+(?:${W}+${NW}+){0,2}?(?:feuille|papier)${E}`), // pierre feuille / pierre, papier
  rx(String.raw`${B}(?:feuille|papier)${NW}+(?:${W}+${NW}+){0,2}?ciseaux?${E}`),
  rx(String.raw`${B}pierre${NW}+(?:${W}+${NW}+){0,2}?ciseaux?${E}`),
];
const MOVE = rx(String.raw`${B}(pierre|feuille|papier|ciseaux?)${E}`);
const MOVE_NORM: Record<string, string> = { papier: "feuille", ciseau: "ciseaux" };

export const CLUSTER_GAP = 45; // s : deux détections plus proches que ça = même passage
export const LEAD_IN = 8; // s : l'extrait démarre un peu avant le premier mot-clé
export const TAIL = 20; // s : … et finit un peu après le dernier

/** minuscules, sans accents */
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Mn}/gu, "");

const TS = String.raw`(\d+):(\d{2}):(\d{2})\.(\d{3})`;
const CUE_RE = new RegExp(`^${TS} --> ${TS}`);
const INLINE_RE = new RegExp(`<${TS}>`);
const INLINE_FULL = new RegExp(`^<${TS}>$`);

const secs = (h: string, m: string, s: string, ms: string) => +h * 3600 + +m * 60 + +s + +ms / 1000;
const groups = (m: RegExpMatchArray) => m.slice(1, 5) as [string, string, string, string];
const splitWords = (s: string) => s.split(/\s+/).filter(Boolean);

/** Les mots d'un fichier WebVTT avec leur temps, sans les répétitions des sous-titres auto. */
export function parseVtt(content: string): TimedWord[] {
  // les mêmes fins de ligne que str.splitlines() en Python
  // eslint-disable-next-line no-control-regex
  const lines = content.split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/);
  const hasInline = lines.some((l) => l.includes("<c>"));
  const words: TimedWord[] = [];
  let lastText: string | undefined;
  let cueStart = 0;
  for (const line of lines) {
    const cue = line.match(CUE_RE);
    if (cue) {
      cueStart = secs(...groups(cue));
      continue;
    }
    if (!line.trim() || /^(WEBVTT|Kind:|Language:)/.test(line)) continue;
    if (hasInline) {
      // sous-titres auto : seules les lignes avec horodatage par mot sont nouvelles
      if (!line.includes("<c>") && !INLINE_RE.test(line)) continue;
      let t = cueStart;
      for (const chunk of line.split(/(<\d+:\d{2}:\d{2}\.\d{3}>)/)) {
        const tm = chunk.match(INLINE_FULL);
        if (tm) {
          t = secs(...groups(tm));
          continue;
        }
        for (const w of splitWords(chunk.replace(/<[^>]+>/g, ""))) words.push([t, w]);
      }
    } else {
      const text = line.replace(/<[^>]+>/g, "").trim();
      if (text && text !== lastText) {
        for (const w of splitWords(text)) words.push([cueStart, w]);
        lastText = text;
      }
    }
  }
  return words;
}

type Hit = [time: number, kind: "coup" | "fort", text: string];

const compareHits = (x: Hit, y: Hit) =>
  x[0] - y[0] || (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0) || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0);

/** Les passages qui ressemblent à un chifoumi. */
export function detect(words: TimedWord[]): Detection[] {
  if (!words.length) return [];
  // texte normalisé + correspondance position -> temps
  const offsets: [pos: number, time: number][] = [];
  const parts: string[] = [];
  let pos = 0;
  for (const [t, w] of words) {
    const n = normalize(w);
    offsets.push([pos, t]);
    parts.push(n);
    pos += n.length + 1;
  }
  const text = parts.join(" ");

  function timeAt(char: number): number {
    let lo = 0;
    let hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsets[mid]![0] <= char) lo = mid;
      else hi = mid - 1;
    }
    return offsets[lo]![1];
  }

  const hits: Hit[] = [];
  for (const re of STRONG) for (const m of text.matchAll(re)) hits.push([timeAt(m.index), "fort", m[0]]);
  for (const m of text.matchAll(MOVE)) hits.push([timeAt(m.index), "coup", MOVE_NORM[m[1]!] ?? m[1]!]);
  hits.sort(compareHits);

  const clusters: Hit[][] = [];
  for (const h of hits) {
    const last = clusters.at(-1);
    if (last && h[0] - last.at(-1)![0] <= CLUSTER_GAP) last.push(h);
    else clusters.push([h]);
  }

  const results: Detection[] = [];
  for (const c of clusters) {
    const strong = c.filter((h) => h[1] === "fort");
    const moves = new Set(c.filter((h) => h[1] === "coup").map((h) => h[2]));
    if (!strong.length && moves.size < 2) continue; // un "Pierre" isolé = sûrement un prénom
    const start = Math.max(0, Math.trunc(c[0]![0]) - LEAD_IN);
    const end = Math.trunc(c.at(-1)![0]) + TAIL;
    results.push({
      start,
      end,
      score: 3 * strong.length + moves.size,
      keywords: [...new Set([...strong.map((h) => h[2]), ...moves])].sort(),
      snippet: words
        .filter(([t]) => start - 5 <= t && t <= end)
        .map(([, w]) => w)
        .join(" "),
    });
  }
  return results;
}
