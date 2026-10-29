<script setup lang="ts">
import { computed, onMounted, provide, ref } from "vue";
import type { Player, PlayerId } from "@site/domain/types";
import { useReview, type Filter } from "./composables/useReview";
import { REVIEW } from "./store";
import CandidateCard from "./components/CandidateCard.vue";
import ExportDialog from "./components/ExportDialog.vue";
import UndetectedList from "./components/UndetectedList.vue";

const store = useReview();
provide(REVIEW, store);
onMounted(store.init);

const { file, shifumi, error, candidates, counts, reviewOf } = store;

const players = computed<Record<PlayerId, Player> | undefined>(() => {
  const p = shifumi.value?.players;
  return p && { a: p[0], b: p[1] };
});

const filter = ref<Filter>("todo");
const filters = computed(() => {
  const n = counts.value;
  const labels: Record<Filter, string> = {
    todo: `À traiter (${n.todo})`,
    ok: `Validés (${n.ok})`,
    ko: `Rejetés (${n.ko})`,
    done: `Déjà publiés (${n.done})`,
    nodet: `Sans détection (${n.nodet})`,
    all: "Tous",
  };
  return Object.entries(labels) as [Filter, string][];
});
const list = computed(() =>
  candidates.value.filter((c) => filter.value === "all" || reviewOf(c).status === filter.value),
);
const meta = computed(() => {
  const f = file.value;
  if (!f) return "";
  const generated = new Date(f.generated).toLocaleString("fr-FR");
  return `${f.candidates.length} passages détectés dans ${f.videos} vidéos · généré le ${generated}`;
});

const exportDialog = ref<InstanceType<typeof ExportDialog>>();

function onManualAdded() {
  filter.value = "todo";
  window.scrollTo({ top: 0 });
}
</script>

<template>
  <div class="wrap">
    <div class="top">
      <div>
        <h1>Validation des chifoumis 🔍</h1>
        <div class="meta-line">{{ meta }}</div>
      </div>
      <a class="btn" href="http://localhost:5173/">← Retour au site</a>
    </div>

    <div class="bar-tools">
      <div class="seg" role="group" aria-label="Filtrer">
        <button v-for="[v, label] in filters" :key="v" :aria-pressed="v === filter" @click="filter = v">
          {{ label }}
        </button>
      </div>
      <span style="flex: 1"></span>
      <button class="btn primary" @click="exportDialog?.open()">Exporter les duels validés</button>
    </div>

    <div v-if="error === 'shifumi'" class="empty-state">
      Impossible de lire <code>site/src/data/shifumi.json</code>.<br />Lance <code>npm run dev</code> depuis
      <code>tools/</code> (voir README).
    </div>
    <div v-else-if="error === 'candidates'" class="empty-state">
      Pas encore de <code>tools/candidates.json</code>.<br />Lance d'abord <code>npm run detect</code> (voir README).
    </div>
    <template v-else-if="file && players">
      <UndetectedList v-if="filter === 'nodet'" @added="onManualAdded" />
      <template v-else-if="list.length">
        <CandidateCard v-for="c in list" :key="c.id" :candidate="c" :players="players" />
      </template>
      <div v-else class="empty-state">Rien ici 🎉</div>
    </template>
  </div>

  <ExportDialog ref="exportDialog" />
</template>
