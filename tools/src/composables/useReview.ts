import { computed, reactive, ref, watch } from "vue";
import type { RawMatch, ShifumiData } from "@site/domain/types";
import {
  fieldsKey,
  initialReview,
  manualCandidate,
  syncWithFile,
  toExport,
  type Candidate,
  type CandidatesFile,
  type Review,
  type Status,
  type UndetectedVideo,
  type VideoCheck,
} from "../domain/review";

/** même clé que l'ancienne page review.html : la progression déjà faite est gardée */
export const STORE_KEY = "shifumi-review-v1";

/**
 * Ce qui est gardé dans le navigateur, au format historique : l'état de chaque passage par id,
 * plus `__manual` (les passages ajoutés à la main) et `__videos` (les vidéos sans détection vérifiées).
 */
interface Stored {
  reviews: Record<string, Review>;
  manual: Candidate[];
  videos: Record<string, VideoCheck>;
}

function load(): Stored {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") ?? {};
  } catch {
    raw = {};
  }
  const { __manual, __videos, ...reviews } = raw;
  return {
    reviews: reviews as Record<string, Review>,
    manual: (__manual as Candidate[] | undefined) ?? [],
    videos: (__videos as Record<string, VideoCheck> | undefined) ?? {},
  };
}

function save(s: Stored) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...s.reviews, __manual: s.manual, __videos: s.videos }));
  } catch {
    // stockage plein ou bloqué : la progression n'est simplement pas gardée
  }
}

export type Filter = Status | "nodet" | "all";

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return (await r.json()) as T;
}

/** L'état de la page de validation : les données, la progression et l'export. */
export function useReview() {
  const shifumi = ref<ShifumiData>();
  const file = ref<CandidatesFile>();
  const error = ref<"shifumi" | "candidates">();
  const stored = reactive(load());
  watch(stored, save, { deep: true });

  const matches = computed<RawMatch[]>(() => shifumi.value?.matches ?? []);
  const candidates = computed<Candidate[]>(() => file.value?.candidates ?? []);
  const undetected = computed<UndetectedVideo[]>(() => file.value?.undetected ?? []);

  function reviewOf(c: Candidate): Review {
    return (stored.reviews[c.id] ??= initialReview(c, matches.value));
  }

  async function init() {
    try {
      shifumi.value = await fetchJson<ShifumiData>("/api/shifumi");
    } catch {
      error.value = "shifumi";
      return;
    }
    let f: CandidatesFile;
    try {
      f = await fetchJson<CandidatesFile>("/api/candidates");
    } catch {
      error.value = "candidates";
      return;
    }
    // les passages ajoutés à la main survivent aux relances de la détection
    f.candidates.unshift(...stored.manual);
    for (const c of f.candidates) syncWithFile(reviewOf(c), c, matches.value);
    file.value = f;
  }

  const counts = computed(() => {
    const n: Record<Status | "nodet", number> = { todo: 0, ok: 0, ko: 0, done: 0, nodet: 0 };
    for (const c of candidates.value) n[reviewOf(c).status]++;
    for (const v of undetected.value) if (!stored.videos[v.videoId]) n.nodet++;
    return n;
  });

  /** une vidéo sans détection contient en fait un chifoumi : on l'ajoute à traiter */
  function addManual(v: UndetectedVideo) {
    const c = manualCandidate(v);
    stored.manual.push(c);
    file.value?.candidates.unshift(c);
    reviewOf(c);
    stored.videos[v.videoId] = "found";
  }

  const exportItems = computed(() => toExport(candidates.value, reviewOf, matches.value));

  /** écrit les duels à exporter dans site/src/data/shifumi.json ; renvoie le résumé affiché */
  async function writeExport(): Promise<string> {
    const items = exportItems.value;
    const r = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: items.map(({ entry, replace }) => ({ id: entry.id, replace, match: entry })),
      }),
    });
    const res = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) throw new Error(res.error ?? String(r.status));
    const list = matches.value;
    for (const { candidate, entry, replace } of items) {
      if (replace) list[list.findIndex((m) => m.id === entry.id)] = entry;
      else list.push(entry);
      const s = reviewOf(candidate);
      s.status = "done";
      s.base = fieldsKey(s);
    }
    const added = items.filter((x) => !x.replace).length;
    const updated = items.length - added;
    return (
      [added ? `${added} ajouté${added > 1 ? "s" : ""}` : "", updated ? `${updated} mis à jour` : ""]
        .filter(Boolean)
        .join(", ") + " dans shifumi.json ✓"
    );
  }

  return {
    shifumi,
    file,
    error,
    matches,
    candidates,
    undetected,
    videos: stored.videos,
    counts,
    reviewOf,
    init,
    addManual,
    exportItems,
    writeExport,
  };
}
