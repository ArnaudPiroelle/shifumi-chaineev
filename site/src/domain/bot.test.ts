import { describe, expect, it } from "vitest";
import { botMove, botProfile, pickWeighted, type BotProfile } from "./bot";
import { computeStats } from "./stats";
import { prepareMatches } from "./matches";

const profile: BotProfile = {
  opening: { pierre: 9, feuille: 0, ciseaux: 0 },
  moves: { pierre: 0, feuille: 0, ciseaux: 8 },
  keepRate: 0.25,
};
/** un « hasard » qui rejoue la liste donnée */
const seq =
  (...values: number[]) =>
  () =>
    values.shift()!;

describe("bot", () => {
  it("tire proportionnellement aux comptes, chaque coup gardant une chance", () => {
    // poids 10, 1, 1 sur 12
    expect(pickWeighted(profile.opening, 0)).toBe("pierre");
    expect(pickWeighted(profile.opening, 0.8)).toBe("pierre");
    expect(pickWeighted(profile.opening, 0.85)).toBe("feuille");
    expect(pickWeighted(profile.opening, 0.99)).toBe("ciseaux");
    expect(pickWeighted(profile.opening, 0.5, ["feuille", "ciseaux"])).toBe("ciseaux");
  });

  it("ouvre selon ses ouvertures", () => {
    expect(botMove(profile, null, seq(0.5))).toBe("pierre");
  });

  it("après une égalité, garde son coup selon son habitude, sinon en change", () => {
    expect(botMove(profile, "feuille", seq(0.1))).toBe("feuille");
    const changed = botMove(profile, "feuille", seq(0.9, 0.5));
    expect(changed).not.toBe("feuille");
    expect(changed).toBe("ciseaux"); // poids 1 pour pierre, 9 pour ciseaux
  });

  it("reprend les habitudes d'un joueur dans les stats", () => {
    const [m] = prepareMatches([
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
    ]);
    const p = botProfile(computeStats([m!]), "a");
    expect(p.opening.pierre).toBe(1);
    expect(p.moves.pierre).toBe(2);
    expect(p.keepRate).toBe(1);
  });
});
