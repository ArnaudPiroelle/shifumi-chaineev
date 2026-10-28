<script setup lang="ts">
import { useShifumi } from "../../composables/useShifumi";
import { PLAYER_IDS } from "../../domain/moves";

const { players, matches, streaks, winnerOf } = useShifumi();
const recent = matches.slice(-15);
</script>

<template>
  <div v-for="id in PLAYER_IDS" :key="id" class="streak">
    <span :style="{ color: players[id].color }">Meilleure série de {{ players[id].name }}</span>
    <span class="v">{{ streaks.best[id] }}</span>
  </div>
  <div class="streak">
    <span>Série en cours</span>
    <span class="v" :style="{ color: streaks.current.who ? players[streaks.current.who].color : 'inherit' }">
      {{ streaks.current.n }}
    </span>
  </div>
  <p class="sub" style="margin: 12px 0 0">Forme récente (du plus ancien au plus récent)</p>
  <div class="form">
    <b
      v-for="m in recent"
      :key="m.id"
      :style="{ background: winnerOf(m).color }"
      :title="`${m.car} — ${winnerOf(m).name}`"
      >{{ m.winner ? winnerOf(m).name[0] : "=" }}</b
    >
  </div>
</template>
