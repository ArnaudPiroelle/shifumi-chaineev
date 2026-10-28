import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import DuelsSection from "./DuelsSection.vue";
import { useShifumi } from "../../composables/useShifumi";

describe("DuelsSection", () => {
  it("filtre la liste selon le gagnant choisi", async () => {
    const { matches, stats } = useShifumi();
    const w = mount(DuelsSection);
    expect(w.findAll(".duel")).toHaveLength(matches.length);
    await w
      .findAll(".seg button")
      .find((b) => b.text() === "Nuls")!
      .trigger("click");
    expect(w.findAll(".duel")).toHaveLength(stats.draws);
    expect(w.find(".count").text()).toBe(`${stats.draws} duel${stats.draws > 1 ? "s" : ""}`);
  });
});
