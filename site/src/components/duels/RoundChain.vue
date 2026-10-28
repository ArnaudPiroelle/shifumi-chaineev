<script setup lang="ts">
import { MOVES } from "../../domain/moves";
import type { Match } from "../../domain/types";

defineProps<{ match: Match }>();
</script>

<template>
  <div class="chain">
    <template v-for="(r, i) in match.rounds" :key="i">
      <span v-if="i" class="arrow">→</span>
      <span class="round" :class="{ final: i === match.rounds.length - 1 }">
        <span :class="{ w: i === match.rounds.length - 1 && match.winner === 'a' }">{{ MOVES[r.a].emoji }}</span>
        <small>vs</small>
        <span :class="{ w: i === match.rounds.length - 1 && match.winner === 'b' }">{{ MOVES[r.b].emoji }}</span>
      </span>
    </template>
  </div>
</template>
