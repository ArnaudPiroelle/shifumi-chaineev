import { computed, reactive } from "vue";
import { emptyFilter, filterMatches } from "../domain/filter";
import type { Match } from "../domain/types";

/** Filtre de la liste des duels : état réactif + liste filtrée. */
export function useDuelFilter(matches: readonly Match[]) {
  const filter = reactive(emptyFilter());
  const filtered = computed(() => filterMatches(matches, filter));
  return { filter, filtered };
}
