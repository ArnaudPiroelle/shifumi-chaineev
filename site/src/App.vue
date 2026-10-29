<script setup lang="ts">
import { computed, ref } from "vue";
import { useShifumi } from "./composables/useShifumi";
import { useDuelLink } from "./composables/useDuelLink";
import ScoreBoard from "./components/ScoreBoard.vue";
import StatsSection from "./components/stats/StatsSection.vue";
import DuelsSection from "./components/duels/DuelsSection.vue";
import DuelDialog from "./components/duels/DuelDialog.vue";
import CoachSection from "./components/coach/CoachSection.vue";
import GitHubLink from "./components/GitHubLink.vue";
import ReportSection from "./components/ReportSection.vue";
import ChifoumiGame from "./components/game/ChifoumiGame.vue";

const { players, findMatch } = useShifumi();
const { openId, open, close } = useDuelLink();
const openMatch = computed(() => (openId.value ? findMatch(openId.value) : undefined));
// le mode « Faire un chifoumi » : n'existe que pendant la partie (le quitter remet tout à zéro)
const playing = ref(false);

// les couleurs des joueurs pilotent tout le thème (dégradés, barres…)
document.documentElement.style.setProperty("--a", players.a.color);
document.documentElement.style.setProperty("--b", players.b.color);
</script>

<template>
  <header class="hero">
    <div class="wrap">
      <div class="hero-actions">
        <button class="play-link" @click="playing = true">✊ Faire un Chifoumi</button>
        <GitHubLink />
      </div>
      <p class="eyebrow">⚡ LaChaineEv · Classement officieux</p>
      <h1>Le Grand Prix du <span class="accent">Chifoumi</span></h1>
      <p class="lede">
        Chaque essai de voiture électrique a son duel de pierre-feuille-ciseaux. Voici qui mène la course.
      </p>
      <ScoreBoard />
    </div>
  </header>

  <nav class="tabs wrap" aria-label="Sections">
    <a href="#stats">📊 Infographie</a>
    <a href="#coach">🧠 Le coach</a>
    <a href="#duels">🎬 Tous les duels</a>
  </nav>

  <main class="wrap">
    <StatsSection />
    <CoachSection />
    <DuelsSection @open="open" />
    <ReportSection />
  </main>

  <footer class="wrap">
    <p>Site non officiel, indépendant de LaChaineEv. Les extraits vidéo sont lus depuis YouTube.</p>
  </footer>

  <DuelDialog :match="openMatch" @close="close" />
  <ChifoumiGame v-if="playing" @close="playing = false" />
</template>
