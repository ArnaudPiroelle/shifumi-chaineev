import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import DuelCard from "./DuelCard.vue";
import { prepareMatches } from "../../domain/matches";
import { rawMatch } from "../../test/fixtures";

describe("DuelCard", () => {
  const [match] = prepareMatches([
    rawMatch("ff,pc", {
      id: "x-1",
      car: "Kia EV3",
      stake: "Qui conduit",
      video: { id: "abc", start: "1:05", title: "" },
    }),
  ]);

  it("affiche la voiture, l'enjeu, le temps et les égalités", () => {
    const text = mount(DuelCard, { props: { match: match! } }).text();
    expect(text).toContain("Kia EV3");
    expect(text).toContain("🎯 Qui conduit");
    expect(text).toContain("1:05");
    expect(text).toContain("1 égalité");
    expect(text).toContain("🏆 JC");
  });

  it("émet open avec l'id au clic", async () => {
    const w = mount(DuelCard, { props: { match: match! } });
    await w.trigger("click");
    expect(w.emitted("open")).toEqual([["x-1"]]);
  });
});
