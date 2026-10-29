import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import DuelsSection from "./DuelsSection.vue";
import { useShifumi } from "../../composables/useShifumi";
import { PAGE_SIZE, pageCount } from "../../domain/pagination";

const pagerButton = (w: ReturnType<typeof mount>, label: string) =>
  w.findAll(".pager button").find((b) => (b.attributes("aria-label") ?? b.text()) === label)!;

describe("DuelsSection", () => {
  it("filtre la liste selon le gagnant choisi", async () => {
    const { stats } = useShifumi();
    const w = mount(DuelsSection);
    await w
      .findAll(".seg button")
      .find((b) => b.text() === "Nuls")!
      .trigger("click");
    expect(w.findAll(".duel")).toHaveLength(Math.min(stats.draws, PAGE_SIZE));
    expect(w.find(".count").text()).toBe(`${stats.draws} duel${stats.draws > 1 ? "s" : ""}`);
  });

  it("pagine les duels et revient à la première page quand le filtre change", async () => {
    const { matches } = useShifumi();
    const pages = pageCount(matches.length);
    expect(pages).toBeGreaterThan(1); // les vraies données remplissent plusieurs pages
    const w = mount(DuelsSection);
    expect(w.findAll(".duel")).toHaveLength(PAGE_SIZE);
    expect(pagerButton(w, "Page précédente").attributes("disabled")).toBeDefined();

    const firstPage = w.findAll(".duel").map((d) => d.text());
    await pagerButton(w, "Page suivante").trigger("click");
    expect(w.find('.pager [aria-current="page"]').text()).toBe("2");
    expect(w.findAll(".duel").map((d) => d.text())).not.toEqual(firstPage);

    await pagerButton(w, String(pages)).trigger("click");
    expect(w.findAll(".duel")).toHaveLength(matches.length - (pages - 1) * PAGE_SIZE);
    expect(pagerButton(w, "Page suivante").attributes("disabled")).toBeDefined();

    await w.find('input[type="search"]').setValue("a");
    expect(w.find('.pager [aria-current="page"]').text()).toBe("1");
  });
});
