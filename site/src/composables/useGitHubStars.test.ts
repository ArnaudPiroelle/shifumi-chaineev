import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { useGitHubStars } from "./useGitHubStars";

function mountWith(fetchImpl: () => Promise<unknown>) {
  const fetchMock = vi.fn(fetchImpl);
  vi.stubGlobal("fetch", fetchMock);
  let stars!: ReturnType<typeof useGitHubStars>["stars"];
  mount(
    defineComponent(() => {
      stars = useGitHubStars("owner/repo").stars;
      return () => h("div");
    }),
  );
  return { stars: () => stars.value, fetchMock };
}

afterEach(() => vi.unstubAllGlobals());

describe("useGitHubStars", () => {
  it("lit le nombre d'étoiles du dépôt", async () => {
    const { stars, fetchMock } = mountWith(async () => ({ ok: true, json: async () => ({ stargazers_count: 5 }) }));
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledWith("https://api.github.com/repos/owner/repo", expect.anything());
    expect(stars()).toBe(5);
  });

  it("reste à null si GitHub refuse ou ne répond pas", async () => {
    const refused = mountWith(async () => ({ ok: false, json: async () => ({}) }));
    await flushPromises();
    expect(refused.stars()).toBeNull();

    const offline = mountWith(async () => {
      throw new TypeError("Failed to fetch");
    });
    await flushPromises();
    expect(offline.stars()).toBeNull();
  });
});
