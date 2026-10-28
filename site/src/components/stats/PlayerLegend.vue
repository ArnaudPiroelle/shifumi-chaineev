<script setup lang="ts">
import { useShifumi } from "../../composables/useShifumi";
import { PLAYER_IDS } from "../../domain/moves";

const { players } = useShifumi();
</script>

<template>
  <div class="legend">
    <span v-for="id in PLAYER_IDS" :key="id"
      ><i :style="{ background: players[id].color }"></i>{{ players[id].name }}</span
    >
  </div>
</template>
