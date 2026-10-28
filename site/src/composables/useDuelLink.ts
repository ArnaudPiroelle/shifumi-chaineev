import { onBeforeUnmount, onMounted, ref } from "vue";

const PREFIX = "#duel-";

const readHash = (): string | null =>
  location.hash.startsWith(PREFIX) ? decodeURIComponent(location.hash.slice(PREFIX.length)) : null;

/**
 * Le duel ouvert, synchronisé avec l'URL : index.html#duel-<id> ouvre directement ce duel
 * (lien partageable), et fermer le duel retire le fragment sans ajouter d'entrée d'historique.
 */
export function useDuelLink() {
  const openId = ref<string | null>(readHash());

  function open(id: string) {
    openId.value = id;
    history.replaceState(null, "", PREFIX + encodeURIComponent(id));
  }
  function close() {
    openId.value = null;
    if (location.hash.startsWith(PREFIX)) history.replaceState(null, "", location.pathname + location.search);
  }

  const onHashChange = () => (openId.value = readHash());
  onMounted(() => window.addEventListener("hashchange", onHashChange));
  onBeforeUnmount(() => window.removeEventListener("hashchange", onHashChange));

  return { openId, open, close };
}
