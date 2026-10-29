<script setup lang="ts">
import { computed } from "vue";
import { useShifumi } from "../composables/useShifumi";
import type { Mood } from "../domain/portraits";
import type { PlayerId } from "../domain/types";
import jcWin from "../assets/players/jc_win.webp";
import jcLoose from "../assets/players/jc_loose.webp";
import alexWin from "../assets/players/alex_win.webp";
import alexLoose from "../assets/players/alex_loose.webp";

const props = defineProps<{ id: PlayerId; mood: Mood }>();

// a = JC, b = Alex (voir players dans src/data/shifumi.json)
const PORTRAITS: Record<PlayerId, Record<Mood, string>> = {
  a: { win: jcWin, loose: jcLoose },
  b: { win: alexWin, loose: alexLoose },
};

const { players } = useShifumi();
const alt = computed(() => `${players[props.id].name}, ${props.mood === "win" ? "content" : "déçu"}`);
</script>

<template>
  <img class="portrait" :class="mood" :src="PORTRAITS[id][mood]" :alt="alt" width="320" height="320" />
</template>
