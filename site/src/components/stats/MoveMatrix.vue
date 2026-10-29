<script setup lang="ts">
import { computed } from "vue";
import { useShifumi, DRAW } from "../../composables/useShifumi";
import { MOVES, MOVE_KEYS, roundResult } from "../../domain/moves";

const { players, stats } = useShifumi();

// une couleur par résultat, la même que dans la légende ; la fréquence, c'est le nombre écrit
const rows = computed(() =>
  MOVE_KEYS.map((a) => ({
    a,
    cells: MOVE_KEYS.map((b) => {
      const n = stats.matrix[`${a}|${b}`];
      const res = roundResult({ a, b });
      return {
        b,
        n,
        background: res ? players[res].color : DRAW.color,
        title: `${players.a.name} ${MOVES[a].label.toLowerCase()}, ${players.b.name} ${MOVES[b].label.toLowerCase()} — ${
          res ? `victoire de ${players[res].name}` : "égalité"
        }`,
      };
    }),
  })),
);
</script>

<template>
  <!-- placement explicite : colonne 1 = les coups de JC, colonnes 2 à 4 = ceux d'Alex -->
  <div class="matrix">
    <div class="axis" :style="{ gridColumn: '2 / -1', gridRow: 1, color: players.b.color }">
      {{ players.b.name }} joue →
    </div>
    <div class="axis axis-corner" :style="{ gridColumn: 1, gridRow: 2, color: players.a.color }">
      {{ players.a.name }} joue ↓
    </div>
    <div
      v-for="(k, j) in MOVE_KEYS"
      :key="k"
      class="h"
      :style="{ gridColumn: j + 2, gridRow: 2 }"
      :title="MOVES[k].label"
    >
      {{ MOVES[k].emoji }}
    </div>
    <template v-for="(row, i) in rows" :key="row.a">
      <div class="h" :style="{ gridColumn: 1, gridRow: i + 3 }" :title="MOVES[row.a].label">
        {{ MOVES[row.a].emoji }}
      </div>
      <div
        v-for="(c, j) in row.cells"
        :key="c.b"
        class="c"
        :style="{ gridColumn: j + 2, gridRow: i + 3, background: c.background }"
        :title="c.title"
      >
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
