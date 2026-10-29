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
  getPlayerState = () => (this.paused ? PAUSED : PLAYING);
  pauseVideo = () => (this.paused = true);
  playVideo = () => (this.paused = false);
  seekTo = (t: number) => (this.time = t);
  unloaded: string[] = [];
  unloadModule = (m: string) => this.unloaded.push(m);
  destroy = () => (this.destroyed = true);
  /** simule un changement d'état venant de YouTube */
  emit(state: number) {
    this.opts.events!.onStateChange!({ data: state } as YT.OnStateChangeEvent);
  }
}
const PLAYING = 1;
const PAUSED = 2;
const CUED = 5;

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
  vi.stubGlobal("YT", { Player: FakePlayer, PlayerState: { PLAYING, PAUSED, CUED } });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useYouTubePlayer", () => {
  const clip: Clip = { videoId: "abc", start: 100.4, end: 110 };

  it("démarre la vidéo au début de l'extrait, sans contrôles, sur youtube-nocookie", async () => {
    setup(clip);
    await nextTick();
    expect(FakePlayer.last.opts).toMatchObject({
      videoId: "abc",
      host: "https://www.youtube-nocookie.com",
      playerVars: { start: 100, autoplay: 1, controls: 0, disablekb: 1 },
    });
  });

  it("retire les sous-titres quand YouTube charge leur module ou lance la lecture", async () => {
    setup(clip);
    await nextTick();
    const p = FakePlayer.last;
    p.opts.events!.onApiChange!({} as YT.PlayerEvent);
    expect(p.unloaded).toEqual(["captions"]);
    p.emit(PLAYING); // YouTube les recharge au lancement de la lecture
    expect(p.unloaded).toEqual(["captions", "captions"]);
  });

  it("met en pause et relance avec toggle(), et signale l'arrêt", async () => {
    const { api } = setup(clip);
    await nextTick();
    const p = FakePlayer.last;
    p.emit(PLAYING);
    api().toggle();
    expect(p.paused).toBe(true);
    p.emit(PAUSED);
    expect(api().stopped.value).toBe(true);
    api().toggle();
    expect(p.paused).toBe(false);
    p.emit(PLAYING);
    expect(api().stopped.value).toBe(false);
  });

  it("replay() revient au début de l'extrait et réarme la pause de fin", async () => {
    const { api } = setup(clip);
    await nextTick();
    const p = FakePlayer.last;
    p.emit(PLAYING);
    p.time = 111;
    vi.advanceTimersByTime(POLL_MS);
    expect(api().pausedAtEnd.value).toBe(true);
    api().toggle(); // sans effet sur le voile de fin
    expect(p.paused).toBe(true);

    api().replay();
    expect(p.time).toBe(100.4);
    expect(p.paused).toBe(false);
    expect(api().pausedAtEnd.value).toBe(false);
    p.emit(PLAYING);
    p.time = 110.5;
    vi.advanceTimersByTime(POLL_MS);
    expect(api().pausedAtEnd.value).toBe(true);
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
