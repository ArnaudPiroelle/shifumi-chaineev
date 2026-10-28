import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import { POLL_MS, useYouTubePlayer, type Clip } from "./useYouTubePlayer";

// faux lecteur YouTube : on pilote la position de lecture à la main
class FakePlayer {
  static last: FakePlayer;
  time = 0;
  paused = false;
  destroyed = false;
  constructor(
    public el: HTMLElement,
    public opts: YT.PlayerOptions,
  ) {
    FakePlayer.last = this;
  }
  getCurrentTime = () => this.time;
  pauseVideo = () => (this.paused = true);
  playVideo = () => (this.paused = false);
  destroy = () => (this.destroyed = true);
  /** simule un changement d'état venant de YouTube */
  emit(state: number) {
    this.opts.events!.onStateChange!({ data: state } as YT.OnStateChangeEvent);
  }
}
const PLAYING = 1;

function setup(initial: Clip | undefined) {
  const clip = ref(initial);
  let api!: ReturnType<typeof useYouTubePlayer>;
  const Host = defineComponent(() => {
    const box = ref<HTMLElement>();
    api = useYouTubePlayer(box, clip);
    return () => h("div", { ref: box });
  });
  const wrapper = mount(Host);
  return { clip, api: () => api, wrapper };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("YT", { Player: FakePlayer, PlayerState: { PLAYING } });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useYouTubePlayer", () => {
  const clip: Clip = { videoId: "abc", start: 100.4, end: 110 };

  it("démarre la vidéo au début de l'extrait, sur youtube-nocookie", async () => {
    setup(clip);
    await nextTick();
    expect(FakePlayer.last.opts).toMatchObject({
      videoId: "abc",
      host: "https://www.youtube-nocookie.com",
      playerVars: { start: 100, autoplay: 1 },
    });
  });

  it("met en pause à la fin de l'extrait, puis reprend avec resume()", async () => {
    const { api } = setup(clip);
    await nextTick();
    const p = FakePlayer.last;
    p.emit(PLAYING);

    p.time = 109.8;
    vi.advanceTimersByTime(POLL_MS);
    expect(p.paused).toBe(false);
    expect(api().pausedAtEnd.value).toBe(false);

    p.time = 110.1;
    vi.advanceTimersByTime(POLL_MS);
    expect(p.paused).toBe(true);
    expect(api().pausedAtEnd.value).toBe(true);

    api().resume();
    expect(p.paused).toBe(false);
    expect(api().pausedAtEnd.value).toBe(false);

    // après « Continuer », la suite de la vidéo n'est plus interrompue
    p.emit(PLAYING);
    p.time = 200;
    vi.advanceTimersByTime(POLL_MS * 4);
    expect(p.paused).toBe(false);
  });

  it("ne coupe rien sans fin d'extrait", async () => {
    setup({ ...clip, end: null });
    await nextTick();
    const p = FakePlayer.last;
    p.emit(PLAYING);
    p.time = 10_000;
    vi.advanceTimersByTime(POLL_MS * 4);
    expect(p.paused).toBe(false);
  });

  it("détruit le lecteur quand le duel se ferme ou au démontage", async () => {
    const { clip: c, wrapper } = setup(clip);
    await nextTick();
    const first = FakePlayer.last;
    c.value = undefined;
    await nextTick();
    expect(first.destroyed).toBe(true);

    c.value = { ...clip, videoId: "def" };
    await nextTick();
    const second = FakePlayer.last;
    expect(second.opts.videoId).toBe("def");
    wrapper.unmount();
    expect(second.destroyed).toBe(true);
  });
});
