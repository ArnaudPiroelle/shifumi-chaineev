<script setup lang="ts">
import { MOVE_KEYS, MOVES, PLAYER_IDS } from "@site/domain/moves";
import type { Move, Player, PlayerId } from "@site/domain/types";
import { draftResult, type DraftRound } from "../domain/review";

defineProps<{ rounds: DraftRound[]; players: Record<PlayerId, Player> }>();
const emit = defineEmits<{ pick: [i: number, p: PlayerId, m: Move]; remove: [i: number] }>();
</script>

<template>
  <div class="rounds">
    <div class="rhead">
      <span></span>
      <span :style="{ color: players.a.color }">{{ players.a.name }}</span>
      <span></span>
      <span :style="{ color: players.b.color }">{{ players.b.name }}</span>
      <span></span>
    </div>
    <div v-for="(r, i) in rounds" :key="i" class="rrow">
      <span class="n">Manche {{ i + 1 }}</span>
      <template v-for="p in PLAYER_IDS" :key="p">
        <div class="picks" :style="{ '--pc': players[p].color }">
          <button v-for="k in MOVE_KEYS" :key="k" :aria-pressed="r[p] === k" :title="k" @click="emit('pick', i, p, k)">
            {{ MOVES[k].emoji }}
          </button>
        </div>
        <span v-if="p === 'a'" class="res">
          <template v-if="draftResult(r) === undefined">…</template>
          <template v-else-if="draftResult(r) === null">égalité</template>
          <b v-else :style="{ color: players[draftResult(r)!].color }">{{ players[draftResult(r)!].name }}</b>
        </span>
      </template>
      <button class="del" title="Supprimer la manche" :hidden="rounds.length < 2" @click="emit('remove', i)">✕</button>
    </div>
  </div>
</template>
