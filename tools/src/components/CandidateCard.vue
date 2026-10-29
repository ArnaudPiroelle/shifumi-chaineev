<script setup lang="ts">
import { computed, ref } from "vue";
import type { Move, Player, PlayerId } from "@site/domain/types";
import {
  existingMatch,
  fmt,
  highlight,
  isDraw,
  isEdited,
  parseTime,
  pick,
  takeFromFile,
  validate,
  type Candidate,
  type Status,
} from "../domain/review";
import { useStore } from "../store";
import RoundsEditor from "./RoundsEditor.vue";
import VideoBox from "./VideoBox.vue";

const props = defineProps<{ candidate: Candidate; players: Record<PlayerId, Player> }>();

const store = useStore();
const review = computed(() => store.reviewOf(props.candidate));
const existing = computed(() => existingMatch(store.matches.value, props.candidate));
const edited = computed(() => isEdited(props.candidate, review.value, store.matches.value));
const error = computed(() => validate(review.value));
const message = computed(() => {
  if (review.value.status === "todo" && error.value) return error.value;
  if (!error.value && isDraw(review.value)) return "🤝 Fin sur égalité : duel nul, sans vainqueur";
  return "";
});
const parts = computed(() => highlight(props.candidate.snippet, props.candidate.keywords));
const watchUrl = computed(
  () => `https://www.youtube.com/watch?v=${encodeURIComponent(props.candidate.videoId)}&t=${props.candidate.start}s`,
);

const video = ref<InstanceType<typeof VideoBox>>();

async function setTime(field: "start" | "end") {
  const t = await video.value?.currentTime();
  if (t !== undefined) review.value[field] = t;
}
function setTyped(field: "start" | "end", e: Event) {
  review.value[field] = parseTime((e.target as HTMLInputElement).value);
}
function onPick(i: number, p: PlayerId, m: Move) {
  pick(review.value, i, p, m);
}
function setStatus(status: Status) {
  const r = review.value;
  if (status === "ok") {
    if (error.value) return;
    r.rounds = r.rounds.filter((x) => x.a || x.b);
  }
  r.status = status;
}
</script>

<template>
  <article class="cand" :class="review.status">
    <div>
      <VideoBox ref="video" :video-id="candidate.videoId" :start="review.start ?? candidate.start" />
      <div class="time-tools">
        <label>Début <input type="text" :value="fmt(review.start)" @change="setTyped('start', $event)" /></label>
        <button class="btn sm" title="Prend le temps actuel du lecteur" @click="setTime('start')">
          📍 = maintenant
        </button>
        <label>Fin <input type="text" :value="fmt(review.end)" @change="setTyped('end', $event)" /></label>
        <button class="btn sm" @click="setTime('end')">🏁 = maintenant</button>
        <button class="btn sm" @click="video?.replay(review.start ?? 0)">⏪ Revoir l'extrait</button>
      </div>
    </div>
    <div class="info">
      <h3>
        <a :href="watchUrl" target="_blank" rel="noopener">{{ candidate.title }}</a>
      </h3>
      <div class="tags">
        <span>{{ candidate.date || "date ?" }}</span>
        <span v-if="candidate.manual">ajouté à la main</span>
        <template v-else>
          <span>détecté à {{ fmt(candidate.start + 8) }}</span>
          <span>score {{ candidate.score }}</span>
        </template>
        <span v-for="k in candidate.keywords" :key="k">{{ k }}</span>
        <span v-if="existing" class="warn">déjà publié ({{ existing.id }})</span>
        <span v-if="edited" class="warn">modifié : à réexporter</span>
        <span v-if="review.conflict" class="warn">modifié ici et dans shifumi.json : non exporté</span>
      </div>
      <div class="snippet">
        <template v-for="(part, i) in parts" :key="i">
          <mark v-if="i % 2">{{ part }}</mark>
          <template v-else>{{ part }}</template>
        </template>
      </div>
      <div class="row2">
        <label class="fld">Voiture <input v-model="review.car" type="text" placeholder="Renault 5 E-Tech" /></label>
        <label class="fld">
          Enjeu (facultatif) <input v-model="review.stake" type="text" placeholder="Qui conduit en premier" />
        </label>
      </div>
      <RoundsEditor
        :rounds="review.rounds"
        :players="players"
        @pick="onPick"
        @remove="(i) => review.rounds.splice(i, 1)"
      />
      <label class="fld">Note (facultatif) <input v-model="review.note" type="text" /></label>
      <div class="actions">
        <button class="btn primary" :disabled="!!error" @click="setStatus('ok')">✓ Valider</button>
        <button class="btn danger" @click="setStatus('ko')">✕ Pas un chifoumi</button>
        <button v-if="review.status !== 'todo'" class="btn" @click="setStatus('todo')">↺ Remettre à traiter</button>
        <button
          v-if="review.conflict"
          class="btn"
          title="Oublie les modifications faites ici"
          @click="takeFromFile(review, candidate, store.matches.value)"
        >
          ⤓ Reprendre le fichier
        </button>
        <span class="err">{{ message }}</span>
      </div>
    </div>
  </article>
</template>
