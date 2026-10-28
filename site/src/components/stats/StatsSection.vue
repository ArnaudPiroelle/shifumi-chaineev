<script setup lang="ts">
import { useShifumi } from "../../composables/useShifumi";
import StatCard from "./StatCard.vue";
import KpiGrid from "./KpiGrid.vue";
import TimelineChart from "./TimelineChart.vue";
import MoveBars from "./MoveBars.vue";
import DonutChart from "./DonutChart.vue";
import MoveMatrix from "./MoveMatrix.vue";
import AfterTie from "./AfterTie.vue";
import StreaksCard from "./StreaksCard.vue";

const { players, stats } = useShifumi();
</script>

<template>
  <section id="stats">
    <h2>Infographie</h2>
    <KpiGrid />

    <div class="grid">
      <StatCard title="La course au titre" wide>
        <template #sub>Victoires cumulées, duel après duel</template>
        <TimelineChart />
      </StatCard>

      <StatCard title="Coups joués">
        <template #sub>Toutes manches confondues, égalités comprises</template>
        <MoveBars :counts="stats.moves" />
      </StatCard>

      <StatCard title="Coups gagnants">
        <template #sub>Le coup qui a décroché la victoire</template>
        <MoveBars :counts="stats.winningMoves" />
      </StatCard>

      <StatCard title="Le coup d'ouverture">
        <template #sub>Premier coup joué dans chaque duel</template>
        <div class="donuts">
          <DonutChart :player="players.a" :counts="stats.opening.a" />
          <DonutChart :player="players.b" :counts="stats.opening.b" />
        </div>
      </StatCard>

      <StatCard title="Face-à-face des coups">
        <template #sub>Chaque manche jouée — ligne : {{ players.a.name }}, colonne : {{ players.b.name }}</template>
        <MoveMatrix />
      </StatCard>

      <StatCard title="Après une égalité…">
        <template #sub>Garde-t-on le même coup ou change-t-on ?</template>
        <AfterTie />
      </StatCard>

      <StatCard title="Séries">
        <template #sub>Victoires d'affilée</template>
        <StreaksCard />
      </StatCard>
    </div>
  </section>
</template>
