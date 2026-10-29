import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import GitHubLink from "./GitHubLink.vue";
import { GITHUB_REPO } from "../config";

afterEach(() => vi.unstubAllGlobals());

describe("GitHubLink", () => {
  it("pointe vers le dépôt et affiche le nombre d'étoiles", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ stargazers_count: 5 }) })),
    );
    const w = mount(GitHubLink);
    await flushPromises();
    expect(w.attributes("href")).toBe(`https://github.com/${GITHUB_REPO}`);
    expect(w.find(".gh-stars").text()).toBe("5");
  });

  it("affiche un tiret si GitHub ne répond pas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) })),
    );
    const w = mount(GitHubLink);
    await flushPromises();
    expect(w.find(".gh-stars").text()).toBe("–");
  });
});
