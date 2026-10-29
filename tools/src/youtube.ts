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
    window.onYouTubeIframeAPIReady = resolve;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  }));
}
