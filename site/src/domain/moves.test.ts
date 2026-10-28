import { describe, expect, it } from "vitest";
import { counterOf, favoriteMove, roundResult } from "./moves";

describe("roundResult", () => {
  it("désigne le gagnant de la manche", () => {
    expect(roundResult({ a: "pierre", b: "ciseaux" })).toBe("a");
    expect(roundResult({ a: "ciseaux", b: "pierre" })).toBe("b");
    expect(roundResult({ a: "feuille", b: "pierre" })).toBe("a");
    expect(roundResult({ a: "ciseaux", b: "feuille" })).toBe("a");
  });
  it("renvoie null sur une égalité", () => {
    expect(roundResult({ a: "feuille", b: "feuille" })).toBeNull();
  });
});

describe("counterOf", () => {
  it("donne le coup qui bat", () => {
    expect(counterOf("pierre")).toBe("feuille");
    expect(counterOf("feuille")).toBe("ciseaux");
    expect(counterOf("ciseaux")).toBe("pierre");
  });
});

describe("favoriteMove", () => {
  it("prend le plus joué, pierre puis feuille en cas d'égalité", () => {
    expect(favoriteMove({ pierre: 1, feuille: 3, ciseaux: 2 })).toBe("feuille");
    expect(favoriteMove({ pierre: 2, feuille: 2, ciseaux: 2 })).toBe("pierre");
  });
});
