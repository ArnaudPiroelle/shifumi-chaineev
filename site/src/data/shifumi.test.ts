// Garde-fou sur les vraies données : un duel mal saisi casse les tests (et donc le build en CI).
import { describe, expect, it } from "vitest";
import data from "./shifumi.json";
import { validateMatch } from "../domain/matches";
import { toSeconds } from "../domain/format";
import type { ShifumiData } from "../domain/types";

const { players, matches } = data as ShifumiData;

describe("src/data/shifumi.json", () => {
  it("a les deux joueurs a et b", () => {
    expect(players.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it.each(matches.map((m) => [m.id, m] as const))("duel %s bien saisi", (_, m) => {
    expect(validateMatch(m)).toEqual([]);
  });

  it("n'a pas deux fois le même id", () => {
    const seen = new Set<string>();
    const dups = matches.filter((m) => seen.size === seen.add(m.id).size).map((m) => m.id);
    expect(dups).toEqual([]);
  });

  it("n'a pas deux duels à moins d'une minute dans la même vidéo (doublon probable)", () => {
    const close: string[] = [];
    matches.forEach((m, i) =>
      matches.slice(i + 1).forEach((o) => {
        const gap = Math.abs((toSeconds(m.video.start) ?? 0) - (toSeconds(o.video.start) ?? 0));
        if (m.video.id === o.video.id && gap < 60) close.push(`${m.id} / ${o.id}`);
      }),
    );
    expect(close).toEqual([]);
  });
});
