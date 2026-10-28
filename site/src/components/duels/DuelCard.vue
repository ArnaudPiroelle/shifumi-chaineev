<script setup lang="ts">
import { computed } from "vue";
import { useShifumi } from "../../composables/useShifumi";
import { fmtDate, fmtTime, plural } from "../../domain/format";
import type { Match } from "../../domain/types";
import RoundChain from "./RoundChain.vue";

const props = defineProps<{ match: Match }>();
defineEmits<{ open: [id: string] }>();

const { winnerOf } = useShifumi();
const winner = computed(() => winnerOf(props.match));
const thumb = computed(() => `https://i.ytimg.com/vi/${encodeURIComponent(props.match.video.id)}/hqdefault.jpg`);
</script>

<template>
  <button class="duel" :style="{ '--winner': winner.color }" @click="$emit('open', match.id)">
    <div class="thumb" :style="{ backgroundImage: `url('${thumb}')` }">
      <span class="play">▶</span>
      <span v-if="match.start != null" class="ts">{{ fmtTime(match.start) }}</span>
    </div>
    <div class="duel-body">
      <div class="duel-top">
        <span>{{ fmtDate(match.date) }}</span>
        <span v-if="match.ties" class="badge-ties">{{ plural(match.ties, "égalité") }}</span>
      </div>
      <div class="title" :title="match.video.title">{{ match.video.title || match.car }}</div>
      <div v-if="match.stake" class="stake">🎯 {{ match.stake }}</div>
      <RoundChain :match="match" />
      <div class="winner-tag">{{ match.winner ? `🏆 ${winner.name}` : "🤝 Pas de vainqueur" }}</div>
    </div>
  </button>
</template>
