import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COUNTDOWN_FROM, TICK_MS, useChifoumiGame } from "./useChifoumiGame";
import { computeStats } from "../domain/stats";
import { prepareMatches } from "../domain/matches";

// JC (a) ouvre toujours à la pierre et garde toujours son coup après une égalité
const stats = computeStats(
  prepareMatches([
    {
      id: "x",
      date: "2026-01-01",
      car: "X",
      video: { id: "v", start: 0, title: "" },
      rounds: [
        { a: "pierre", b: "pierre" },
        { a: "pierre", b: "feuille" },
      ],
    },
  ]),
);
// 0 : le premier coup de la pondération (pierre), et « garde son coup » après une égalité
const rand = () => 0;

describe("useChifoumiGame", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("décompte puis révèle les coups et compte le point", () => {
    const g = useChifoumiGame(stats, rand);
    g.play("feuille");
    expect(g.phase.value).toBe("pick"); // pas d'adversaire choisi
    g.choose("a");
    g.play("feuille");
    expect(g.phase.value).toBe("countdown");
    expect(g.count.value).toBe(COUNTDOWN_FROM);
    vi.advanceTimersByTime(TICK_MS);
    expect(g.count.value).toBe(COUNTDOWN_FROM - 1);
    g.play("pierre"); // ignoré pendant le décompte
    vi.advanceTimersByTime(TICK_MS * COUNTDOWN_FROM);
    expect(g.phase.value).toBe("reveal");
    expect(g.hands.value).toEqual({ user: "feuille", bot: "pierre" });
    expect(g.outcome.value).toBe("win");
    expect({ ...g.score }).toEqual({ user: 1, bot: 0 });
  });

  it("enchaîne les manches après une égalité, comme dans les vidéos", () => {
    const g = useChifoumiGame(stats, rand);
    g.choose("a");
    g.play("pierre");
    vi.runAllTimers();
    expect(g.outcome.value).toBe("tie");
    expect(g.ties.value).toBe(1);
    g.play("ciseaux"); // JC garde la pierre
    vi.runAllTimers();
    expect(g.outcome.value).toBe("lose");
    expect(g.ties.value).toBe(1);
    expect({ ...g.score }).toEqual({ user: 0, bot: 1 });
    g.play("feuille"); // nouveau duel : le compteur d'égalités repart à zéro
    expect(g.ties.value).toBe(0);
  });

  it("changer d'adversaire remet le score à zéro", () => {
    const g = useChifoumiGame(stats, rand);
    g.choose("a");
    g.play("feuille");
    vi.runAllTimers();
    g.choose("b");
    expect({ ...g.score }).toEqual({ user: 0, bot: 0 });
    expect(g.hands.value).toBeNull();
  });
});
