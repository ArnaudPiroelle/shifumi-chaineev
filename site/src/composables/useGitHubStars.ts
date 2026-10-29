import { onMounted, ref } from "vue";

/**
 * Nombre d'étoiles du dépôt, lu sur l'API publique de GitHub au montage.
 * Reste à null tant qu'il n'est pas connu, ou si GitHub ne répond pas (limite de requêtes, hors ligne…) :
 * le lien s'affiche alors sans compteur.
 */
export function useGitHubStars(repo: string) {
  const stars = ref<number | null>(null);
  onMounted(async () => {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!r.ok) return;
      const n = (await r.json()).stargazers_count;
      if (typeof n === "number") stars.value = n;
    } catch {
      // pas de compteur, ce n'est pas grave
    }
  });
  return { stars };
}
