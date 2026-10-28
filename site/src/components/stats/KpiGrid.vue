<script setup lang="ts">
import { computed } from "vue";
import { useShifumi } from "../../composables/useShifumi";
import { pct } from "../../domain/format";

const { players, stats, streaks } = useShifumi();

const kpis = computed(() => {
  const longest = stats.longestTie;
  const cur = streaks.current;
  return [
    { value: stats.total, label: "duels disputés" },
    { value: stats.totalRounds, label: "manches jouées" },
    { value: pct(stats.tieMatches, stats.total) + "%", label: "des duels avec égalité" },
    { value: stats.draws, label: "duel(s) sans vainqueur" },
    {
      value: longest?.ties ?? 0,
      label: "égalités d'affilée max" + (longest?.ties ? ` (${longest.car})` : ""),
    },
    {
      value: cur.who ? cur.n : 0,
      label: cur.who ? `victoire(s) d'affilée en cours pour ${players[cur.who].name}` : "série en cours",
    },
  ];
});
</script>

<template>
  <div class="kpis">
    <div v-for="k in kpis" :key="k.label" class="kpi">
      <div class="v">{{ k.value }}</div>
      <div class="l">{{ k.label }}</div>
    </div>
  </div>
</template>
