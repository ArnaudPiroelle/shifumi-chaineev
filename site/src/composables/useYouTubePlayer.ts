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
 * Lecteur YouTube sans contrôles monté dans `container`, qui lit `clip` et se met en pause à sa fin.
 * `toggle()` met en pause ou relance, `replay()` revient au début de l'extrait,
 * `resume()` reprend la lecture au-delà de la fin (le reste de la vidéo n'est plus interrompu).
 * Changer de clip recrée le lecteur ; un clip `undefined` le détruit (et coupe la vidéo).
 */
export function useYouTubePlayer(container: Ref<HTMLElement | undefined>, clip: Ref<Clip | undefined>) {
  const pausedAtEnd = ref(false);
  /** la vidéo est arrêtée (pause, ou lecture automatique refusée par le navigateur) */
  const stopped = ref(false);
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
    stopped.value = false;
    continued = false;
  }

  // pas de sous-titres : la chaîne ou les préférences du visiteur peuvent les activer, et cc_load_policy ne sait
  // que les forcer. Décharger le module « captions » (méthode non documentée, absente des types) les retire.
  function hideCaptions() {
    (player as (YT.Player & { unloadModule?: (module: string) => void }) | undefined)?.unloadModule?.("captions");
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
      // juste l'extrait : ni contrôles, ni raccourcis clavier, ni annotations, ni plein écran
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        rel: 0,
        playsinline: 1,
        ...(c.start != null ? { start: Math.floor(c.start) } : {}),
      },
      events: {
        // YouTube (re)charge le module des sous-titres au lancement de la lecture : on le retire à ce moment-là
        onApiChange: hideCaptions,
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) hideCaptions();
          stopped.value = e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.CUED;
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

  function toggle() {
    if (!player || pausedAtEnd.value) return;
    if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
  }

  /** revient au début de l'extrait ; la pause de fin est de nouveau active */
  function replay() {
    const c = clip.value;
    if (!player || !c) return;
    continued = false;
    pausedAtEnd.value = false;
    player.seekTo(c.start ?? 0, true);
    player.playVideo();
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

  return { pausedAtEnd, stopped, resume, toggle, replay };
}
