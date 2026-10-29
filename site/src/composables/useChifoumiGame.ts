import { computed, onBeforeUnmount, reactive, ref } from "vue";
import { botMove, botProfile } from "../domain/bot";
import { roundResult } from "../domain/moves";
import type { Stats } from "../domain/stats";
import type { Move, PlayerId } from "../domain/types";

export const COUNTDOWN_FROM = 3;
export const TICK_MS = 700;

export type Outcome = "win" | "lose" | "tie";

/**
 * Une partie de chifoumi contre JC ou Alex, joués par un bot qui reprend leurs habitudes.
 * Comme dans les vidéos, une égalité relance une manche jusqu'à ce qu'il y ait un gagnant.
 */
export function useChifoumiGame(stats: Stats, rand: () => number = Math.random) {
  const opponent = ref<PlayerId | null>(null);
  /** pick : on attend le coup du joueur ; countdown : 3, 2, 1… ; reveal : les coups sont montrés */
  const phase = ref<"pick" | "countdown" | "reveal">("pick");
  const count = ref(COUNTDOWN_FROM);
  const hands = ref<{ user: Move; bot: Move } | null>(null);
  const outcome = ref<Outcome | null>(null);
  /** égalités dans le duel en cours */
  const ties = ref(0);
  const score = reactive({ user: 0, bot: 0 });
  // le coup du bot à la manche précédente, s'il y a eu égalité : il s'en sert pour la suivante
  let botPrevious: Move | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const profile = computed(() => (opponent.value ? botProfile(stats, opponent.value) : null));

  function reset() {
    clearTimeout(timer);
    phase.value = "pick";
    hands.value = null;
    outcome.value = null;
    ties.value = 0;
    botPrevious = null;
  }

  function choose(id: PlayerId | null) {
    reset();
    opponent.value = id;
    score.user = 0;
    score.bot = 0;
  }

  function play(move: Move) {
    if (!profile.value || phase.value === "countdown") return;
    if (outcome.value && outcome.value !== "tie") ties.value = 0; // nouveau duel
    // le bot choisit avant de « voir » le coup du joueur
    hands.value = { user: move, bot: botMove(profile.value, botPrevious, rand) };
    outcome.value = null;
    phase.value = "countdown";
    count.value = COUNTDOWN_FROM;
    tick();
  }

  function tick() {
    timer = setTimeout(() => {
      if (count.value > 1) {
        count.value--;
        tick();
      } else reveal();
    }, TICK_MS);
  }

  function reveal() {
    const h = hands.value!;
    const res = roundResult({ a: h.user, b: h.bot });
    phase.value = "reveal";
    if (!res) {
      outcome.value = "tie";
      ties.value++;
      botPrevious = h.bot;
      return;
    }
    outcome.value = res === "a" ? "win" : "lose";
    score[res === "a" ? "user" : "bot"]++;
    botPrevious = null;
  }

  onBeforeUnmount(() => clearTimeout(timer));

  return { opponent, phase, count, hands, outcome, ties, score, choose, play };
}
