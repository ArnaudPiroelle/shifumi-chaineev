import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import DonutChart from "./DonutChart.vue";
import type { Player } from "../../domain/types";

const player: Player = { id: "a", name: "JC", color: "#3ee6a8" };
// pierre 50 %, feuille 25 %, ciseaux 25 % : en partant de midi, la feuille occupe le quart de 6 h à 9 h
const counts = { pierre: 2, feuille: 1, ciseaux: 1 };

describe("DonutChart", () => {
  it("fait sortir la part survolée le long de sa bissectrice", async () => {
    const w = mount(DonutChart, { props: { player, counts } });
    expect(w.findAll(".slice.out")).toHaveLength(0);

    await w.findAll(".slice")[1]!.trigger("mouseenter");
    const out = w.find(".slice.out");
    // milieu de la feuille : 7 h 30, donc vers la gauche et vers le bas
    const [dx, dy] = out
      .attributes("style")!
      .match(/-?[\d.]+(?:e-?\d+)?/g)!
      .map(Number);
    expect(dx).toBeLessThan(0);
    expect(dy).toBeGreaterThan(0);
    expect(-dx!).toBeCloseTo(dy!);
    expect(w.find("svg text").text()).toBe("✋");
  });

  it("le survol d'un pourcentage fait sortir sa part, et la quitter la rentre", async () => {
    const w = mount(DonutChart, { props: { player, counts } });
    await w.findAll(".share")[2]!.trigger("mouseenter");
    expect(w.findAll(".slice")[2]!.classes()).toContain("out");
    expect(w.findAll(".share")[2]!.classes()).toContain("on");
    await w.find(".donut").trigger("mouseleave");
    expect(w.findAll(".slice.out")).toHaveLength(0);
    expect(w.find("svg text").text()).toBe("✊"); // retour au coup favori
  });
});
