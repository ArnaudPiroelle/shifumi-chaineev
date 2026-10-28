import { describe, expect, it } from "vitest";
import { prepareMatches } from "./matches";
import { computeStats, computeStreaks, cumulativeWins } from "./stats";
import { rawMatch } from "../test/fixtures";

// a gagne, b gagne après une égalité, nul, a gagne, a gagne
const matches = prepareMatches([
  rawMatch("pc", { date: "2024-01-01", car: "A" }),
  rawMatch("ff,pf", { date: "2024-01-02", car: "B" }),
  rawMatch("cc,cc,pp", { date: "2024-01-03", car: "C" }),
  rawMatch("fp", { date: "2024-01-04", car: "D" }),
  rawMatch("cf", { date: "2024-01-05", car: "E" }),
]);

describe("computeStats", () => {
  const s = computeStats(matches);

  it("compte victoires, nuls et manches", () => {
    expect(s.wins).toEqual({ a: 3, b: 1 });
    expect(s.draws).toBe(1);
    expect(s.totalRounds).toBe(8);
    expect(s.tieMatches).toBe(2);
    expect(s.leader).toBe("a");
  });
  it("retient le duel avec le plus d'égalités", () => {
    expect(s.longestTie?.car).toBe("C");
  });
  it("compte les coups joués, d'ouverture et gagnants", () => {
    expect(s.moves.a).toEqual({ pierre: 3, feuille: 2, ciseaux: 3 });
    expect(s.opening.b).toEqual({ pierre: 1, feuille: 2, ciseaux: 2 });
    expect(s.winningMoves.a).toEqual({ pierre: 1, feuille: 1, ciseaux: 1 });
    expect(s.winningMoves.b).toEqual({ pierre: 0, feuille: 1, ciseaux: 0 });
  });
  it("remplit la matrice et l'après-égalité", () => {
    expect(s.matrix["ciseaux|ciseaux"]).toBe(2);
    expect(s.matrix["pierre|ciseaux"]).toBe(1);
    // B : f→p (a change), f→f (b garde) ; C : c→c, c→p (chacun garde puis change)
    expect(s.afterTie.a).toEqual({ keep: 1, change: 2 });
    expect(s.afterTie.b).toEqual({ keep: 2, change: 1 });
  });
  it("fonctionne sans aucun duel", () => {
    expect(computeStats([])).toMatchObject({ total: 0, leader: null, longestTie: null });
  });
});

describe("computeStreaks", () => {
  it("un nul casse la série", () => {
    expect(computeStreaks(matches)).toEqual({ best: { a: 2, b: 1 }, current: { who: "a", n: 2 } });
  });
});

describe("cumulativeWins", () => {
  it("part de 0 – 0 et ajoute chaque victoire", () => {
    expect(cumulativeWins(matches)).toEqual([
      { a: 0, b: 0 },
      { a: 1, b: 0 },
      { a: 1, b: 1 },
      { a: 1, b: 1 },
      { a: 2, b: 1 },
      { a: 3, b: 1 },
    ]);
  });
});
