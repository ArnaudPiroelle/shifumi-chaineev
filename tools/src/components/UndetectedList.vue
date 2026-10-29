<script setup lang="ts">
import { computed } from "vue";
import { fmt, type UndetectedVideo } from "../domain/review";
import { useStore } from "../store";

const emit = defineEmits<{ added: [] }>();
const store = useStore();

// les vidéos déjà vérifiées passent en bas
const sorted = computed(() =>
  store.undetected.value.slice().sort((x, y) => Number(!!store.videos[x.videoId]) - Number(!!store.videos[y.videoId])),
);
const watchUrl = (v: UndetectedVideo) => `https://www.youtube.com/watch?v=${encodeURIComponent(v.videoId)}`;
const thumb = (v: UndetectedVideo) => `url('https://i.ytimg.com/vi/${encodeURIComponent(v.videoId)}/mqdefault.jpg')`;

function add(v: UndetectedVideo) {
  store.addManual(v);
  emit("added");
}
</script>

<template>
  <div v-if="!sorted.length" class="empty-state">
    Aucune vidéo sans détection<template v-if="!store.file.value?.undetected">
      (relance <code>npm run detect -- --offline</code> pour générer la liste)</template
    >.
  </div>
  <template v-else>
    <p class="sub">
      Vidéos où aucun mot-clé n'a été trouvé. Parcours-les et marque-les comme vérifiées, ou ajoute le chifoumi que la
      détection a raté.
    </p>
    <div v-for="v in sorted" :key="v.videoId" class="vrow" :class="{ checked: store.videos[v.videoId] }">
      <a class="vthumb" :href="watchUrl(v)" target="_blank" rel="noopener" :style="{ backgroundImage: thumb(v) }"></a>
      <div class="info">
        <a class="vtitle" :href="watchUrl(v)" target="_blank" rel="noopener">{{ v.title }}</a>
        <div class="tags">
          <span>{{ v.date || "date ?" }}</span>
          <span v-if="v.duration">{{ fmt(v.duration) }}</span>
          <span v-if="!v.subs" class="warn">pas de sous-titres</span>
          <span v-if="store.videos[v.videoId] === 'checked'">✓ vérifiée, rien</span>
          <span v-else-if="store.videos[v.videoId] === 'found'">＋ chifoumi ajouté</span>
        </div>
      </div>
      <div class="actions">
        <button v-if="store.videos[v.videoId]" class="btn sm" @click="delete store.videos[v.videoId]">
          ↺ À vérifier
        </button>
        <template v-else>
          <button class="btn sm" @click="store.videos[v.videoId] = 'checked'">✓ Vérifiée, rien</button>
          <button class="btn sm primary" @click="add(v)">＋ Il y a un chifoumi</button>
        </template>
      </div>
    </div>
  </template>
</template>
