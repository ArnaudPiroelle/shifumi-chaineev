import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareMatches, validateMatch } from "./matches";
import { rawMatch } from "../test/fixtures";

afterEach(() => vi.restoreAllMocks());

describe("validateMatch", () => {
  it("accepte un duel bien saisi", () => {
    expect(validateMatch(rawMatch("pp,fp"))).toEqual([]);
  });
  it("refuse un gagnant avant la dernière manche", () => {
    expect(validateMatch(rawMatch("pc,fp"))).toEqual(["manche 1 : seule la dernière peut avoir un gagnant"]);
  });
  it("refuse un coup inconnu, une date ou une fin invalide", () => {
    const m = rawMatch("pp", { date: "05/10/2026", video: { id: "v", start: "1:00", end: "0:30", title: "" } });
    m.rounds.push({ a: "lezard" as never, b: "pierre" });
    expect(validateMatch(m)).toEqual([
      'date "05/10/2026" au mauvais format (AAAA-MM-JJ)',
      "fin de l'extrait invalide",
      "manche 2 : coup inconnu",
    ]);
  });
});

describe("prepareMatches", () => {
  it("calcule gagnant, égalités et temps", () => {
    const [m] = prepareMatches([rawMatch("cc,pc", { video: { id: "v", start: "19:45", end: "20:27", title: "" } })]);
    expect(m).toMatchObject({ winner: "a", ties: 1, start: 1185, end: 1227 });
  });
  it("un duel qui finit sur une égalité est nul", () => {
    expect(prepareMatches([rawMatch("ff,ff")])[0]).toMatchObject({ winner: null, ties: 2 });
  });
  it("trie par date et écarte les duels invalides avec un avertissement", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = prepareMatches([
      rawMatch("pc", { id: "late", date: "2025-01-01" }),
      rawMatch("pc,pc", { id: "bad" }),
      rawMatch("pc", { id: "early", date: "2023-01-01" }),
    ]);
    expect(out.map((m) => m.id)).toEqual(["early", "late"]);
    expect(warn).toHaveBeenCalledOnce();
  });
});
