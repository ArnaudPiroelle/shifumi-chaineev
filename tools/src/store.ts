import { inject, type InjectionKey } from "vue";
import type { useReview } from "./composables/useReview";

export type ReviewStore = ReturnType<typeof useReview>;
export const REVIEW: InjectionKey<ReviewStore> = Symbol("review");

/** l'état de la page, fourni par App.vue */
export function useStore(): ReviewStore {
  const store = inject(REVIEW);
  if (!store) throw new Error("useStore() hors de App.vue");
  return store;
}
