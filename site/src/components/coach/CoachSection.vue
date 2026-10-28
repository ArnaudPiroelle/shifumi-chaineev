<script setup lang="ts">
import { useShifumi } from "../../composables/useShifumi";
import { coachAdvice } from "../../domain/coach";
import { MOVES, PLAYER_IDS } from "../../domain/moves";

const { players, stats } = useShifumi();
const advice = PLAYER_IDS.map((id) => coachAdvice(stats, id));
</script>

<template>
  <section id="coach">
    <h2>Le coach 🧠</h2>
    <p class="sub">
      Ce que les stats conseillent pour battre chacun au prochain essai (à prendre avec beaucoup de second degré).
    </p>
    <div class="grid">
      <p v-if="!stats.total" class="sub">Le coach attend les premiers duels pour donner ses conseils.</p>
      <template v-else>
        <article
          v-for="a in advice"
          :key="a.target"
          class="card coach"
          :style="{ borderColor: `color-mix(in srgb, ${players[a.opponent].color} 50%, var(--line))` }"
        >
          <h3>
            Pour battre <span :style="{ color: players[a.target].color }">{{ players[a.target].name }}</span>
          </h3>
          <div class="big" style="margin-top: 12px">{{ MOVES[a.counter].emoji }}</div>
          <p>
            En ouverture, {{ players[a.target].name }} joue
            <strong>{{ MOVES[a.favorite].label.toLowerCase() }} {{ a.favoriteRate }}%</strong> du temps.
            {{ players[a.opponent].name }}, ouvre avec <strong>{{ MOVES[a.counter].label.toLowerCase() }}</strong
            >.
          </p>
          <p v-if="a.afterTie?.keeps">
            Après une égalité, {{ players[a.target].name }} <strong>garde son coup {{ a.afterTie.rate }}%</strong> du
            temps : joue ce qui bat le coup précédent.
          </p>
          <p v-else-if="a.afterTie">
            Après une égalité, {{ players[a.target].name }} <strong>change de coup {{ a.afterTie.rate }}%</strong> du
            temps : évite de rejouer ce qui battait son coup précédent.
          </p>
        </article>
      </template>
    </div>
  </section>
</template>
