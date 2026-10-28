<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useShifumi } from "../../composables/useShifumi";
import { fmtDate, plural } from "../../domain/format";
import { MOVES, roundResult } from "../../domain/moves";
import type { Match } from "../../domain/types";

const props = defineProps<{ match: Match | undefined }>();
const emit = defineEmits<{ close: [] }>();

const { players, winnerOf } = useShifumi();
const dialog = ref<HTMLDialogElement>();

// le <dialog> natif suit le duel ouvert ; le fermer (✕, Échap, clic à côté) prévient le parent
function sync(m: Match | undefined) {
  const d = dialog.value;
  if (!d) return;
  if (m && !d.open) d.showModal();
  if (!m && d.open) d.close();
}
watch(() => props.match, sync, { flush: "post" });
// lien direct #duel-<id> : le duel est déjà choisi au premier rendu
onMounted(() => sync(props.match));

const winner = computed(() => props.match && winnerOf(props.match));
const embedUrl = computed(() => {
  const m = props.match;
  if (!m) return "";
  const params = new URLSearchParams({ autoplay: "1", rel: "0", modestbranding: "1" });
  if (m.start != null) params.set("start", String(m.start));
  if (m.end != null) params.set("end", String(m.end));
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(m.video.id)}?${params}`;
});
const youtubeUrl = computed(() => {
  const m = props.match;
  if (!m) return "";
  return `https://www.youtube.com/watch?v=${encodeURIComponent(m.video.id)}${m.start != null ? `&t=${m.start}s` : ""}`;
});
const verdict = computed(() => {
  const m = props.match;
  if (!m || !winner.value) return "";
  if (!m.winner) return `🤝 Pas de vainqueur après ${plural(m.ties, "égalité")}`;
  return `🏆 Victoire de ${winner.value.name}${m.ties ? ` après ${plural(m.ties, "égalité")}` : ""}`;
});

function onBackdropClick(e: MouseEvent) {
  if (e.target === dialog.value) dialog.value?.close();
}
</script>

<template>
  <dialog
    ref="dialog"
    :style="winner ? { '--winner': winner.color } : undefined"
    @close="emit('close')"
    @click="onBackdropClick"
  >
    <template v-if="match && winner">
      <div class="dlg-head">
        <strong>{{ match.video.title || match.car }}</strong>
        <button class="close" aria-label="Fermer" @click="dialog?.close()">✕</button>
      </div>
      <!-- l'iframe n'existe que dialogue ouvert : la fermer coupe la vidéo -->
      <div class="video">
        <iframe
          :key="match.id"
          :src="embedUrl"
          title="Extrait YouTube"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      </div>
      <div>
        <div class="duel-top">
          <span>{{ fmtDate(match.date) }} · {{ match.car }}</span>
          <span><a :href="youtubeUrl" target="_blank" rel="noopener">Ouvrir sur YouTube ↗</a></span>
        </div>
        <div v-if="match.stake">
          🎯 Enjeu : <strong>{{ match.stake }}</strong>
        </div>
        <div class="step" style="background: none; padding-top: 0; padding-bottom: 0">
          <span></span>
          <strong :style="{ textAlign: 'center', color: players.a.color }">{{ players.a.name }}</strong>
          <span></span>
          <strong :style="{ textAlign: 'center', color: players.b.color }">{{ players.b.name }}</strong>
        </div>
        <div class="steps">
          <div v-for="(r, i) in match.rounds" :key="i" class="step" :class="{ final: i === match.rounds.length - 1 }">
            <span class="n">Manche {{ i + 1 }}</span>
            <span class="m" :title="`${players.a.name} : ${MOVES[r.a].label}`">{{ MOVES[r.a].emoji }}</span>
            <span class="res">
              <span v-if="roundResult(r)" :style="{ color: players[roundResult(r)!].color }">
                {{ players[roundResult(r)!].name }}
              </span>
              <template v-else>égalité</template>
            </span>
            <span class="m" :title="`${players.b.name} : ${MOVES[r.b].label}`">{{ MOVES[r.b].emoji }}</span>
          </div>
        </div>
        <div class="winner-tag" :style="{ color: winner.color, fontSize: '1.1rem' }">{{ verdict }}</div>
        <p v-if="match.note" class="sub" style="margin: 0">{{ match.note }}</p>
      </div>
    </template>
  </dialog>
</template>
