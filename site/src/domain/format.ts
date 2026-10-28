/** "12:34", "1:02:03" ou 754 → secondes */
export function toSeconds(t: string | number | null | undefined): number | null {
  if (t == null || t === "") return null;
  if (typeof t === "number") return t;
  return t.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
}

/** 754 → "12:34", 3723 → "1:02:03" */
export function fmtTime(s: number | null): string {
  if (s == null) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h ? String(m).padStart(2, "0") : m;
  return (h ? h + ":" : "") + mm + ":" + String(sec).padStart(2, "0");
}

/** "2026-10-05" → "5 oct. 2026" */
export function fmtDate(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/** pourcentage arrondi, 0 si le total est nul */
export const pct = (n: number, d: number): number => (d ? Math.round((n / d) * 100) : 0);

/** "1 égalité", "3 égalités" */
export const plural = (n: number, word: string): string => `${n} ${word}${n > 1 ? "s" : ""}`;
