import { describe, expect, it } from "vitest";
import { fmtTime, pct, plural, toSeconds } from "./format";

describe("toSeconds", () => {
  it.each([
    ["12:34", 754],
    ["1:02:03", 3723],
    [90, 90],
    ["", null],
    [undefined, null],
  ])("%s → %s", (input, expected) => expect(toSeconds(input)).toBe(expected));
});

describe("fmtTime", () => {
  it("formate en m:ss ou h:mm:ss", () => {
    expect(fmtTime(754)).toBe("12:34");
    expect(fmtTime(3723)).toBe("1:02:03");
    expect(fmtTime(5)).toBe("0:05");
    expect(fmtTime(null)).toBe("");
  });
});

describe("pct / plural", () => {
  it("arrondit et protège la division par zéro", () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(1, 0)).toBe(0);
  });
  it("accorde au pluriel", () => {
    expect(plural(1, "égalité")).toBe("1 égalité");
    expect(plural(3, "égalité")).toBe("3 égalités");
  });
});
