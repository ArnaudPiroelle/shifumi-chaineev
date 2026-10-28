<script setup lang="ts">
import { useShifumi } from "../../composables/useShifumi";
import { pct } from "../../domain/format";
import { PLAYER_IDS } from "../../domain/moves";

const { players, stats } = useShifumi();
const total = (id: "a" | "b") => stats.afterTie[id].keep + stats.afterTie[id].change;
</script>

<template>
  <div v-for="id in PLAYER_IDS" :key="id" class="split">
    <div class="who" :style="{ color: players[id].color }">{{ players[id].name }}</div>
    <div v-if="total(id)" class="track">
      <span :style="{ width: pct(stats.afterTie[id].keep, total(id)) + '%', background: players[id].color }">
        <template v-if="stats.afterTie[id].keep">garde {{ pct(stats.afterTie[id].keep, total(id)) }}%</template>
      </span>
      <span
        :style="{
          width: pct(stats.afterTie[id].change, total(id)) + '%',
          background: `color-mix(in srgb, ${players[id].color} 45%, var(--panel-2))`,
        }"
      >
        <template v-if="stats.afterTie[id].change">change {{ pct(stats.afterTie[id].change, total(id)) }}%</template>
      </span>
    </div>
    <p v-else class="sub">Pas encore de données.</p>
  </div>
  <p class="sub">Basé sur {{ total("a") }} manche(s) jouée(s) juste après une égalité.</p>
</template>
