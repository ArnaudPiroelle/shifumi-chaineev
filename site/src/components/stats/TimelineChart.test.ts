import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import TimelineChart from "./TimelineChart.vue";
import { useShifumi } from "../../composables/useShifumi";

// jsdom n'a pas de mise en page : on fixe la taille du svg à celle du viewBox
function mountSized() {
  const wrapper = mount(TimelineChart);
  const svg = wrapper.find("svg").element;
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 260 }) as DOMRect;
  return wrapper;
}

// jsdom n'a pas de PointerEvent : un MouseEvent du même nom suffit pour le gestionnaire
async function point(wrapper: ReturnType<typeof mount>, clientX: number) {
  wrapper.find("svg").element.dispatchEvent(new MouseEvent("pointermove", { clientX }));
  await nextTick();
}

describe("TimelineChart", () => {
  it("affiche au survol le score cumulé du duel le plus proche", async () => {
    const { players, matches, cumulative } = useShifumi();
    const wrapper = mountSized();
    expect(wrapper.find(".chart-tip").exists()).toBe(false);

    await point(wrapper, 1000);
    const n = matches.length;
    const tip = wrapper.find(".chart-tip");
    expect(tip.text()).toContain(`Duel ${n}`);
    expect(tip.text()).toContain(matches[n - 1]!.car);
    expect(tip.text()).toContain(`${players.a.name} ${cumulative[n]!.a}`);
    expect(tip.text()).toContain(`${players.b.name} ${cumulative[n]!.b}`);
    expect(wrapper.find(".hover-mark line").exists()).toBe(true);

    await wrapper.find("svg").trigger("pointerleave");
    expect(wrapper.find(".chart-tip").exists()).toBe(false);
  });

  it("se cale sur le premier duel tout à gauche", async () => {
    const wrapper = mountSized();
    await point(wrapper, 0);
    expect(wrapper.find(".chart-tip").text()).toContain("Duel 1 ");
  });
});
