<script setup lang="ts">
import { computed } from "vue";
import { pct } from "../../domain/format";
import { MOVES, MOVE_KEYS, favoriteMove, sumMoves } from "../../domain/moves";
import type { Move, MoveCount, Player } from "../../domain/types";

const props = defineProps<{ player: Player; counts: MoveCount }>();

const R = 40;
const C = 2 * Math.PI * R;
// une seule couleur par joueur, nuancée par coup
const SHADES: Record<Move, number> = { pierre: 1, feuille: 0.6, ciseaux: 0.3 };

const sum = computed(() => sumMoves(props.counts) || 1);
const arcs = computed(() => {
  let offset = 0;
  return MOVE_KEYS.map((k) => {
    const len = (props.counts[k] / sum.value) * C;
    const arc = { k, len, offset: -offset };
    offset += len;
    return arc;
  });
});
const fav = computed(() => favoriteMove(props.counts));
const shares = computed(() =>
  MOVE_KEYS.map((k) => `${MOVES[k].emoji} ${pct(props.counts[k], sum.value)}%`).join(" · "),
);
</script>

<template>
  <div class="donut">
    <svg viewBox="0 0 120 120">
      <circle
        v-for="a in arcs"
        :key="a.k"
        :r="R"
        cx="60"
        cy="60"
        fill="none"
        :stroke="player.color"
        :stroke-opacity="SHADES[a.k]"
        stroke-width="18"
        :stroke-dasharray="`${a.len} ${C - a.len}`"
        :stroke-dashoffset="a.offset"
        transform="rotate(-90 60 60)"
      >
        <title>{{ MOVES[a.k].label }} : {{ counts[a.k] }}</title>
      </circle>
      <text x="60" y="70" text-anchor="middle" font-size="30">{{ MOVES[fav].emoji }}</text>
    </svg>
    <div class="who" :style="{ color: player.color }">{{ player.name }}</div>
    <div class="fav">{{ shares }}</div>
  </div>
</template>
