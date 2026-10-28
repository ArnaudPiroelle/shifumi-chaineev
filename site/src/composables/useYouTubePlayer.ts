import { onBeforeUnmount, ref, watch, type Ref } from "vue";

export interface Clip {
  videoId: string;
  /** début de l'extrait, en secondes */
  start: number | null;
  /** fin de l'extrait : la vidéo se met en pause ici, une seule fois */
  end: number | null;
}

/** temps entre deux lectures de la position de la vidéo (l'API n'a pas d'événement « timeupdate ») */
export const POLL_MS = 250;

declare global {
  interface Window {
    /** appelé par https://www.youtube.com/iframe_api une fois l'API prête */
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiReady: Promise<void> | undefined;

/** Charge l'API IFrame de YouTube une seule fois pour toute la page. */
export function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  return (apiReady ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  }));
}

/**
 * Lecteur YouTube monté dans `container`, qui lit `clip` et se met en pause à sa fin.
 * `resume()` reprend la lecture au-delà de la fin (le reste de la vidéo n'est plus interrompu).
 * Changer de clip recrée le lecteur ; un clip `undefined` le détruit (et coupe la vidéo).
 */
export function useYouTubePlayer(container: Ref<HTMLElement | undefined>, clip: Ref<Clip | undefined>) {
  const pausedAtEnd = ref(false);
  let player: YT.Player | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let continued = false;

  function stopPolling() {
    clearInterval(timer);
    timer = undefined;
  }
  function destroy() {
    stopPolling();
    player?.destroy();
    player = undefined;
    pausedAtEnd.value = false;
    continued = false;
  }

  function checkEnd(end: number) {
    if (!player || continued || player.getCurrentTime() < end) return;
    player.pauseVideo();
    pausedAtEnd.value = true;
    stopPolling();
  }

  async function create(el: HTMLElement, c: Clip) {
    await loadYouTubeApi();
    // le clip a pu changer ou le dialogue se fermer pendant le chargement de l'API
    if (clip.value !== c || container.value !== el) return;
    // YouTube remplace l'élément par son iframe : on lui donne un enfant, pas l'élément géré par Vue
    const target = document.createElement("div");
    el.replaceChildren(target);
    player = new YT.Player(target, {
      host: "https://www.youtube-nocookie.com",
      videoId: c.videoId,
      playerVars: { autoplay: 1, rel: 0, playsinline: 1, ...(c.start != null ? { start: Math.floor(c.start) } : {}) },
      events: {
        onStateChange: (e) => {
          // on ne surveille la position que pendant la lecture
          if (e.data === YT.PlayerState.PLAYING && c.end != null && !continued && !timer) {
            const end = c.end;
            timer = setInterval(() => checkEnd(end), POLL_MS);
          } else if (e.data !== YT.PlayerState.PLAYING) {
            stopPolling();
          }
        },
      },
    });
  }

  function resume() {
    continued = true;
    pausedAtEnd.value = false;
    player?.playVideo();
  }

  watch(
    [container, clip],
    ([el, c]) => {
      destroy();
      if (el && c) void create(el, c);
    },
    { flush: "post", immediate: true },
  );
  onBeforeUnmount(destroy);

  return { pausedAtEnd, resume };
}
