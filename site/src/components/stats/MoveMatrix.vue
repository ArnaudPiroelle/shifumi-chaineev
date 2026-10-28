<script setup lang="ts">
import { computed } from "vue";
import { useShifumi, DRAW } from "../../composables/useShifumi";
import { MOVES, MOVE_KEYS, roundResult } from "../../domain/moves";

const { players, stats } = useShifumi();

const rows = computed(() => {
  const max = Math.max(1, ...Object.values(stats.matrix));
  return MOVE_KEYS.map((a) => ({
    a,
    cells: MOVE_KEYS.map((b) => {
      const n = stats.matrix[`${a}|${b}`];
      const res = roundResult({ a, b });
      const color = res ? players[res].color : DRAW.color;
      // plus la case est fréquente, plus elle est opaque
      const alpha = n ? 0.18 + 0.7 * (n / max) : 0.06;
      return {
        b,
        n,
        background: `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`,
        title: `${MOVES[a].label} vs ${MOVES[b].label} — ${res ? `victoire ${players[res].name}` : "égalité"}`,
      };
    }),
  }));
});
</script>

<template>
  <div class="matrix">
    <div class="h"></div>
    <div v-for="k in MOVE_KEYS" :key="k" class="h" :style="{ color: players.b.color }">{{ MOVES[k].emoji }}</div>
    <template v-for="row in rows" :key="row.a">
      <div class="h">{{ MOVES[row.a].emoji }}</div>
      <div v-for="c in row.cells" :key="c.b" class="c" :style="{ background: c.background }" :title="c.title">
        {{ c.n }}
      </div>
    </template>
  </div>
  <div class="legend">
    <span><i :style="{ background: players.a.color }"></i>gagné par {{ players.a.name }}</span>
    <span><i :style="{ background: players.b.color }"></i>gagné par {{ players.b.name }}</span>
    <span><i :style="{ background: DRAW.color }"></i>égalité</span>
  </div>
</template>
