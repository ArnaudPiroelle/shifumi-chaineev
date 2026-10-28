<script setup lang="ts">
import { useShifumi } from "../../composables/useShifumi";
import { useDuelFilter } from "../../composables/useDuelFilter";
import type { DuelFilter } from "../../domain/filter";
import DuelCard from "./DuelCard.vue";

defineEmits<{ open: [id: string] }>();

const { players, matches } = useShifumi();
const { filter, filtered } = useDuelFilter(matches);

const winnerOptions: { value: DuelFilter["winner"]; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "a", label: players.a.name },
  { value: "b", label: players.b.name },
  { value: "draw", label: "Nuls" },
];
</script>

<template>
  <section id="duels">
    <h2>Tous les duels</h2>
    <div class="filters">
      <input
        v-model="filter.query"
        type="search"
        placeholder="Rechercher une voiture, une vidéo…"
        aria-label="Rechercher"
      />
      <div class="seg" role="group" aria-label="Filtrer par gagnant">
        <button
          v-for="o in winnerOptions"
          :key="o.value"
          :aria-pressed="filter.winner === o.value"
          @click="filter.winner = o.value"
        >
          {{ o.label }}
        </button>
      </div>
      <label class="check"><input v-model="filter.onlyTies" type="checkbox" /> Avec égalités seulement</label>
    </div>
    <p class="count">{{ filtered.length }} duel{{ filtered.length > 1 ? "s" : "" }}</p>
    <div class="duels">
      <DuelCard v-for="m in filtered" :key="m.id" :match="m" @open="$emit('open', $event)" />
      <p v-if="!filtered.length" class="sub">Aucun duel ne correspond.</p>
    </div>
  </section>
</template>
