import { describe, expect, it } from "vitest";
import { coachAdvice } from "./coach";
import { prepareMatches } from "./matches";
import { computeStats } from "./stats";
import { rawMatch } from "../test/fixtures";

describe("coachAdvice", () => {
  it("conseille le coup qui bat l'ouverture préférée", () => {
    const stats = computeStats(prepareMatches([rawMatch("cp"), rawMatch("cf"), rawMatch("pc")]));
    expect(coachAdvice(stats, "a")).toMatchObject({
      target: "a",
      opponent: "b",
      favorite: "ciseaux",
      favoriteRate: 67,
      counter: "pierre",
      afterTie: null,
    });
  });
  it("dit si la cible garde ou change son coup après une égalité", () => {
    const stats = computeStats(prepareMatches([rawMatch("pp,pc"), rawMatch("ff,fp"), rawMatch("cc,pc")]));
    expect(coachAdvice(stats, "a").afterTie).toEqual({ keeps: true, rate: 67 });
    expect(coachAdvice(stats, "b").afterTie).toEqual({ keeps: false, rate: 67 });
  });
});
