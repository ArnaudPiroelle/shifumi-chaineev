<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useShifumi } from "../../composables/useShifumi";
import { useChifoumiGame } from "../../composables/useChifoumiGame";
import { MOVES, MOVE_KEYS, PLAYER_IDS } from "../../domain/moves";
import type { Move } from "../../domain/types";
import PlayerPortrait from "../PlayerPortrait.vue";

const emit = defineEmits<{ close: [] }>();

const { players, stats } = useShifumi();
const { opponent, phase, count, hands, outcome, ties, score, choose, play } = useChifoumiGame(stats);

// plein écran par-dessus le site ; Échap ou ✕ ferment, ce qui prévient le parent
const dialog = ref<HTMLDialogElement>();
onMounted(() => dialog.value?.showModal());

const rival = computed(() => (opponent.value ? players[opponent.value] : null));
// « ciseaux » est au pluriel : les phrases s'accordent
const THE: Record<Move, string> = { pierre: "la pierre", feuille: "la feuille", ciseaux: "les ciseaux" };
const YOUR: Record<Move, string> = { pierre: "votre pierre", feuille: "votre feuille", ciseaux: "vos ciseaux" };
const beats = (m: Move) => (m === "ciseaux" ? "battent" : "bat");
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// tant que les coups ne sont pas révélés, les deux mains sont des poings qui battent la mesure
const shown = computed(() => {
  const h = hands.value;
  return phase.value === "reveal" && h
    ? { bot: MOVES[h.bot].emoji, user: MOVES[h.user].emoji }
    : { bot: MOVES.pierre.emoji, user: MOVES.pierre.emoji };
});

const message = computed(() => {
  const h = hands.value;
  if (phase.value !== "reveal" || !h || !rival.value) return "";
  const name = rival.value.name;
  if (outcome.value === "tie") return `Égalité ! ${name} a joué ${THE[h.bot]} aussi.`;
  if (outcome.value === "win") return `Gagné ! ${cap(YOUR[h.user])} ${beats(h.user)} ${THE[h.bot]} de ${name}.`;
  return `Perdu… ${cap(THE[h.bot])} de ${name} ${beats(h.bot)} ${YOUR[h.user]}.`;
});

const prompt = computed(() => {
  if (phase.value === "countdown") return "Chi… fou… mi !";
  if (outcome.value === "tie") return ties.value > 1 ? `On rejoue ! (${ties.value} égalités)` : "On rejoue !";
  if (outcome.value) return "Une revanche ? Choisissez votre coup";
  return "Choisissez votre coup";
});
</script>

<template>
  <dialog ref="dialog" class="arena" aria-label="Faire un chifoumi" @close="emit('close')">
    <header class="arena-top">
      <strong>✊ Faire un chifoumi</strong>
      <span v-if="rival" class="arena-score">
        Vous <b>{{ score.user }}</b> – <b>{{ score.bot }}</b
        >&nbsp;<span :style="{ color: rival.color }">{{ rival.name }}</span>
      </span>
      <button class="close" aria-label="Quitter le chifoumi" @click="dialog?.close()">✕</button>
    </header>

    <div v-if="!opponent || !rival" class="arena-pick">
      <h2>Contre qui voulez-vous jouer ?</h2>
      <p class="sub">Il joue comme dans les vidéos : mêmes ouvertures, mêmes réflexes après une égalité.</p>
      <div class="arena-opponents">
        <button
          v-for="id in PLAYER_IDS"
          :key="id"
          class="arena-opponent"
          :style="{ '--c': players[id].color }"
          @click="choose(id)"
        >
          <PlayerPortrait :id="id" mood="win" />
          <span :style="{ color: players[id].color }">{{ players[id].name }}</span>
        </button>
      </div>
    </div>

    <template v-else>
      <div class="arena-stage">
        <PlayerPortrait :id="opponent" :mood="outcome === 'win' ? 'loose' : 'win'" />
        <div class="arena-hands" :class="[phase, outcome]">
          <figure class="hand bot">
            <span class="emoji">{{ shown.bot }}</span>
            <figcaption :style="{ color: rival.color }">{{ rival.name }}</figcaption>
          </figure>
          <span class="arena-center" aria-live="assertive">
            <!-- une clé par chiffre relance l'animation ; clés distinctes, sinon « 1 » croise la clé implicite du v-else -->
            <span v-if="phase === 'countdown'" :key="`n${count}`" class="count-num">{{ count }}</span>
            <span v-else key="vs" class="vs-small">VS</span>
          </span>
          <figure class="hand user">
            <span class="emoji">{{ shown.user }}</span>
            <figcaption>Vous</figcaption>
          </figure>
        </div>
        <p class="arena-result" :class="outcome" aria-live="polite">{{ message }}</p>
      </div>

      <div class="arena-moves">
        <p class="arena-prompt">{{ prompt }}</p>
        <div class="arena-buttons">
          <button
            v-for="k in MOVE_KEYS"
            :key="k"
            class="arena-move"
            :disabled="phase === 'countdown'"
            :aria-pressed="hands?.user === k && phase !== 'pick'"
            @click="play(k)"
          >
            <span class="emoji" aria-hidden="true">{{ MOVES[k].emoji }}</span>
            <span>{{ MOVES[k].label }}</span>
          </button>
        </div>
        <button class="arena-switch" @click="choose(null)">Changer d'adversaire</button>
      </div>
    </template>
  </dialog>
</template>
