import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ChifoumiGame from "./ChifoumiGame.vue";
import { useShifumi } from "../../composables/useShifumi";

describe("ChifoumiGame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom n'implémente pas les <dialog> modaux
    HTMLDialogElement.prototype.showModal = vi.fn();
  });
  afterEach(() => vi.useRealTimers());

  it("choisit l'adversaire, décompte puis révèle les deux coups", async () => {
    const { players } = useShifumi();
    const w = mount(ChifoumiGame);
    expect(w.find(".arena-pick h2").text()).toBe("Contre qui voulez-vous jouer ?");

    await w.findAll(".arena-opponent")[1]!.trigger("click");
    expect(w.find(".arena-score").text()).toContain(players.b.name);

    await w.findAll(".arena-move")[1]!.trigger("click"); // feuille
    expect(w.find(".count-num").text()).toBe("3");
    expect(w.findAll(".arena-move").every((b) => b.attributes("disabled") !== undefined)).toBe(true);

    vi.runAllTimers();
    await w.vm.$nextTick();
    expect(w.find(".count-num").exists()).toBe(false);
    expect(w.find(".arena-center").text()).toBe("VS");
    expect(w.find(".hand.user .emoji").text()).toBe("✋");
    expect(w.find(".arena-result").text()).toMatch(/^(Gagné|Perdu|Égalité)/);
  });

  it("revient au choix de l'adversaire", async () => {
    const w = mount(ChifoumiGame);
    await w.findAll(".arena-opponent")[0]!.trigger("click");
    await w.find(".arena-switch").trigger("click");
    expect(w.find(".arena-pick").exists()).toBe(true);
  });
});
