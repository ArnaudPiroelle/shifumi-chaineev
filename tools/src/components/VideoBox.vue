<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { loadYouTubeApi } from "../youtube";

const props = defineProps<{ videoId: string; start: number }>();

const box = ref<HTMLElement>();
const loaded = ref(false);
let player: Promise<YT.Player> | undefined;
let instance: YT.Player | undefined;

/** Le lecteur YouTube (avec ses contrôles), créé au premier besoin : la vignette suffit tant qu'on ne lit pas. */
function load(): Promise<YT.Player> {
  return (player ??= (async () => {
    await loadYouTubeApi();
    loaded.value = true;
    // YouTube remplace l'élément par son iframe : on lui donne un enfant, pas l'élément géré par Vue
    const target = document.createElement("div");
    box.value!.replaceChildren(target);
    return new Promise<YT.Player>((resolve) => {
      instance = new YT.Player(target, {
        videoId: props.videoId,
        playerVars: {
          start: Number.isFinite(props.start) ? Math.max(0, Math.floor(props.start)) : 0,
          autoplay: 1,
          rel: 0,
          playsinline: 1,
        },
        events: { onReady: (e) => resolve(e.target) },
      });
    });
  })());
}

/** le temps actuel du lecteur, en secondes entières ; undefined (et le lecteur se lance) s'il n'existe pas encore */
async function currentTime(): Promise<number | undefined> {
  if (!player) {
    void load();
    return undefined;
  }
  return Math.floor((await player).getCurrentTime());
}

async function replay(start: number) {
  const p = await load();
  p.seekTo(start, true);
  p.playVideo();
}

onBeforeUnmount(() => instance?.destroy());

defineExpose({ currentTime, replay });
</script>

<template>
  <div
    ref="box"
    class="vid"
    :style="{ backgroundImage: `url('https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg')` }"
    @click="loaded || load()"
  >
    <span class="play">▶</span>
  </div>
</template>
