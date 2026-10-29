import { describe, expect, it } from "vitest";
import { moodOf } from "./portraits";

describe("moodOf", () => {
  it("le joueur en tête est content, l'autre déçu", () => {
    expect(moodOf("a", "a")).toBe("win");
    expect(moodOf("b", "a")).toBe("loose");
    expect(moodOf("b", "b")).toBe("win");
    expect(moodOf("a", "b")).toBe("loose");
  });
  it("à égalité au score, les deux sont contents", () => {
    expect(moodOf("a", null)).toBe("win");
    expect(moodOf("b", null)).toBe("win");
  });
});
