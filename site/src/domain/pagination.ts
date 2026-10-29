export const PAGE_SIZE = 12;

export const pageCount = (total: number, size = PAGE_SIZE): number => Math.max(1, Math.ceil(total / size));

/** Les éléments de la page `page` (numérotée à partir de 1). */
export const pageSlice = <T>(items: readonly T[], page: number, size = PAGE_SIZE): T[] =>
  items.slice((page - 1) * size, page * size);

/**
 * Les boutons à afficher : toujours la première et la dernière page, la page courante et ses voisines,
 * des « … » pour les trous (un trou d'une seule page affiche directement la page).
 */
export function pageItems(current: number, count: number): (number | "…")[] {
  const keep = new Set([1, count, current - 1, current, current + 1].filter((p) => p >= 1 && p <= count));
  const pages = [...keep].sort((a, b) => a - b);
  const items: (number | "…")[] = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev === 2) items.push(prev + 1);
    else if (p - prev > 2) items.push("…");
    items.push(p);
    prev = p;
  }
  return items;
}
