import { computed, ref, watch, type Ref } from "vue";
import { PAGE_SIZE, pageCount, pageItems, pageSlice } from "../domain/pagination";

/** Pagination d'une liste réactive : revient à la première page dès que la liste change (nouveau filtre). */
export function usePagination<T>(items: Ref<readonly T[]>, size = PAGE_SIZE) {
  const page = ref(1);
  const count = computed(() => pageCount(items.value.length, size));
  const visible = computed(() => pageSlice(items.value, page.value, size));
  const buttons = computed(() => pageItems(page.value, count.value));
  watch(items, () => (page.value = 1));

  function goTo(p: number) {
    page.value = Math.min(Math.max(p, 1), count.value);
  }
  return { page, count, visible, buttons, goTo };
}
