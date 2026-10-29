<script setup lang="ts">
import { useShifumi, DRAW } from "../composables/useShifumi";
import { pct } from "../domain/format";
import { PLAYER_IDS } from "../domain/moves";
import { moodOf } from "../domain/portraits";
import PlayerPortrait from "./PlayerPortrait.vue";
import vsLogo from "../assets/vs.webp";

const { players, stats } = useShifumi();
const share = (n: number) => pct(n, stats.total) + "%";
</script>

<template>
  <!-- les têtes et les noms, au-dessus de la carte du score -->
  <div class="faces">
    <template v-for="(id, i) in PLAYER_IDS" :key="id">
      <div class="face" :class="{ right: i === 1 }">
        <PlayerPortrait :id="id" :mood="moodOf(id, stats.leader)" />
        <span class="name" :style="{ color: players[id].color }">
          <span v-if="stats.leader === id" class="crown" title="En tête">👑</span> {{ players[id].name }}
        </span>
      </div>
      <img v-if="i === 0" class="vs-logo" :src="vsLogo" alt="contre" width="280" height="240" />
    </template>
  </div>
  <div class="scoreboard">
    <template v-for="(id, i) in PLAYER_IDS" :key="id">
      <div class="player" :class="{ right: i === 1 }">
        <span class="wins" :style="{ color: players[id].color }">{{ stats.wins[id] }}</span>
        <span class="meta">{{ pct(stats.wins[id], stats.total) }}% de victoires</span>
      </div>
      <div v-if="i === 0" class="vs">
        {{ stats.total }} duels<template v-if="stats.draws"
          ><br />{{ stats.draws }} nul{{ stats.draws > 1 ? "s" : "" }}</template
        >
      </div>
    </template>
    <div class="bar" aria-hidden="true">
      <span :style="{ width: share(stats.wins.a), background: players.a.color }"></span>
      <span :style="{ width: share(stats.draws), background: DRAW.color }" title="Nuls"></span>
      <span :style="{ width: share(stats.wins.b), background: players.b.color }"></span>
    </div>
  </div>
</template>
