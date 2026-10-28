<script setup lang="ts">
import { computed } from "vue";
import { useShifumi } from "../../composables/useShifumi";
import { pct } from "../../domain/format";
import { MOVES, MOVE_KEYS, PLAYER_IDS, sumMoves } from "../../domain/moves";
import type { MoveCount, PerPlayer } from "../../domain/types";
import PlayerLegend from "./PlayerLegend.vue";

const props = defineProps<{ counts: PerPlayer<MoveCount> }>();
const { players } = useShifumi();

const max = computed(() => Math.max(1, ...MOVE_KEYS.flatMap((k) => [props.counts.a[k], props.counts.b[k]])));
const sum = computed(() => ({ a: sumMoves(props.counts.a), b: sumMoves(props.counts.b) }));
</script>

<template>
  <div>
    <div v-for="k in MOVE_KEYS" :key="k" class="mv-row">
      <div class="mv-emoji" :title="MOVES[k].label">{{ MOVES[k].emoji }}</div>
      <div class="mv-bars">
        <div v-for="id in PLAYER_IDS" :key="id" class="hbar">
          <span class="fill" :style="{ width: (counts[id][k] / max) * 85 + '%', background: players[id].color }"></span
          >{{ counts[id][k] }} <small>({{ pct(counts[id][k], sum[id]) }}%)</small>
        </div>
      </div>
    </div>
    <PlayerLegend />
  </div>
</template>
