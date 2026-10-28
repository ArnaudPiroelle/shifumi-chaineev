<script setup lang="ts">
import { useShifumi } from "../../composables/useShifumi";
import { PLAYER_IDS } from "../../domain/moves";

const { players, streaks } = useShifumi();
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
</template>
