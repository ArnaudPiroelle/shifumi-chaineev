<script setup lang="ts">
import { computed, ref } from "vue";
import { pct } from "../../domain/format";
import { MOVES, MOVE_KEYS, favoriteMove, sumMoves } from "../../domain/moves";
import type { Move, MoveCount, Player } from "../../domain/types";

const props = defineProps<{ player: Player; counts: MoveCount }>();

const R = 40;
const C = 2 * Math.PI * R;
/** de combien la part survolée sort du camembert (unités du viewBox, la marge autour en laisse 11) */
const POP = 7;
// une seule couleur par joueur, nuancée par coup
const SHADES: Record<Move, number> = { pierre: 1, feuille: 0.6, ciseaux: 0.3 };

/** la part survolée, sur le camembert ou sur son pourcentage */
const hovered = ref<Move | null>(null);

const sum = computed(() => sumMoves(props.counts) || 1);
const arcs = computed(() => {
  let offset = 0;
  return MOVE_KEYS.map((k) => {
    const len = (props.counts[k] / sum.value) * C;
    // milieu de la part, en angle depuis midi dans le sens des aiguilles : c'est par là qu'elle sort
    const mid = ((offset + len / 2) / C) * 2 * Math.PI;
    const arc = { k, len, offset: -offset, dx: Math.sin(mid) * POP, dy: -Math.cos(mid) * POP };
    offset += len;
    return arc;
  });
});
const fav = computed(() => favoriteMove(props.counts));
const shares = computed(() =>
  MOVE_KEYS.map((k) => ({ k, text: `${MOVES[k].emoji} ${pct(props.counts[k], sum.value)}%` })),
);
</script>

<template>
  <div class="donut" @mouseleave="hovered = null">
    <svg viewBox="0 0 120 120">
      <g
        v-for="a in arcs"
        :key="a.k"
        class="slice"
        :class="{ out: hovered === a.k }"
        :style="hovered === a.k ? { transform: `translate(${a.dx}px, ${a.dy}px)` } : undefined"
        @mouseenter="hovered = a.k"
      >
        <circle
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
      </g>
      <text x="60" y="70" text-anchor="middle" font-size="30">{{ MOVES[hovered ?? fav].emoji }}</text>
    </svg>
    <div class="who" :style="{ color: player.color }">{{ player.name }}</div>
    <div class="fav">
      <template v-for="(s, i) in shares" :key="s.k">
        <template v-if="i"> · </template>
        <span class="share" :class="{ on: hovered === s.k }" @mouseenter="hovered = s.k">{{ s.text }}</span>
      </template>
    </div>
  </div>
</template>
