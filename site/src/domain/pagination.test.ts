import { describe, expect, it } from "vitest";
import { pageCount, pageItems, pageSlice } from "./pagination";

describe("pagination", () => {
  it("compte les pages, au moins une même vide", () => {
    expect(pageCount(0, 12)).toBe(1);
    expect(pageCount(12, 12)).toBe(1);
    expect(pageCount(13, 12)).toBe(2);
    expect(pageCount(57, 12)).toBe(5);
  });

  it("découpe la page demandée", () => {
    const items = Array.from({ length: 30 }, (_, i) => i);
    expect(pageSlice(items, 1, 12)).toEqual(items.slice(0, 12));
    expect(pageSlice(items, 3, 12)).toEqual([24, 25, 26, 27, 28, 29]);
  });

  it("garde les extrémités et les voisines, avec des … pour les trous", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(1, 5)).toEqual([1, 2, "…", 5]);
    expect(pageItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageItems(5, 10)).toEqual([1, "…", 4, 5, 6, "…", 10]);
    expect(pageItems(10, 10)).toEqual([1, "…", 9, 10]);
  });
});
