import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ScoreBoard from "./ScoreBoard.vue";
import { useShifumi } from "../composables/useShifumi";

describe("ScoreBoard", () => {
  it("affiche le portrait content du joueur en tête et déçu de l'autre", () => {
    const { players, stats } = useShifumi();
    const imgs = mount(ScoreBoard).findAll("img.portrait");
    const leader = stats.leader;
    expect(leader).not.toBeNull(); // les vraies données : quelqu'un mène
    const loser = leader === "a" ? "b" : "a";
    expect(imgs.map((i) => i.attributes("alt"))).toEqual(
      leader === "a"
        ? [`${players.a.name}, content`, `${players.b.name}, déçu`]
        : [`${players.a.name}, déçu`, `${players.b.name}, content`],
    );
    expect(imgs.find((i) => i.attributes("alt")!.startsWith(players[leader!].name))!.attributes("src")).toMatch(/_win/);
    expect(imgs.find((i) => i.attributes("alt")!.startsWith(players[loser].name))!.attributes("src")).toMatch(/_loose/);
  });
});
