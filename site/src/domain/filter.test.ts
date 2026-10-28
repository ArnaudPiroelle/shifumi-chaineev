import { describe, expect, it } from "vitest";
import { emptyFilter, filterMatches } from "./filter";
import { prepareMatches } from "./matches";
import { rawMatch } from "../test/fixtures";

const matches = prepareMatches([
  rawMatch("pc", { id: "1", date: "2024-01-01", car: "Kia EV3" }),
  rawMatch("ff,pf", { id: "2", date: "2024-01-02", car: "Polestar 4", note: "revanche" }),
  rawMatch("pp", { id: "3", date: "2024-01-03", car: "Zoe" }),
]);
const ids = (f: Partial<ReturnType<typeof emptyFilter>>) =>
  filterMatches(matches, { ...emptyFilter(), ...f }).map((m) => m.id);

describe("filterMatches", () => {
  it("liste du plus récent au plus ancien", () => expect(ids({})).toEqual(["3", "2", "1"]));
  it("filtre par gagnant ou nul", () => {
    expect(ids({ winner: "a" })).toEqual(["1"]);
    expect(ids({ winner: "b" })).toEqual(["2"]);
    expect(ids({ winner: "draw" })).toEqual(["3"]);
  });
  it("garde les duels avec égalités", () => expect(ids({ onlyTies: true })).toEqual(["3", "2"]));
  it("cherche dans la voiture et la note, sans casse", () => {
    expect(ids({ query: "  POLESTAR " })).toEqual(["2"]);
    expect(ids({ query: "revanche" })).toEqual(["2"]);
  });
});
