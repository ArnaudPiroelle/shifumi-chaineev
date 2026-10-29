import { describe, expect, it } from "vitest";
import type { RawMatch, ShifumiData } from "../../site/src/domain/types.ts";
import { applyEntries } from "./api.ts";

const match = (id: string, car = "Zoé"): RawMatch => ({
  id,
  date: "2026-01-01",
  car,
  video: { id: "vid", start: "1:00", title: "t" },
  rounds: [{ a: "pierre", b: "ciseaux" }],
});
const data = (): ShifumiData => ({
  players: [
    { id: "a", name: "A", color: "#000" },
    { id: "b", name: "B", color: "#fff" },
  ],
  matches: [match("x")],
});

describe("applyEntries", () => {
  it("ajoute les nouveaux duels et remplace les duels existants", () => {
    const d = data();
    applyEntries(d, [
      { id: "y", match: match("y") },
      { id: "x", replace: true, match: match("x", "Mégane") },
    ]);
    expect(d.matches.map((m) => [m.id, m.car])).toEqual([
      ["x", "Mégane"],
      ["y", "Zoé"],
    ]);
  });

  it("refuse un ajout en double, un remplacement introuvable ou un duel mal formé, sans rien changer", () => {
    const d = data();
    const ok = { id: "y", match: match("y") };
    expect(() => applyEntries(d, [ok, { id: "x", match: match("x") }])).toThrow("déjà présent");
    expect(() => applyEntries(d, [ok, { id: "z", replace: true, match: match("z") }])).toThrow("introuvable");
    expect(() => applyEntries(d, [ok, { id: "w", match: match("autre") }])).toThrow("mal formé");
    expect(() => applyEntries(d, [])).toThrow("aucun duel");
    expect(d).toEqual(data());
  });
});
