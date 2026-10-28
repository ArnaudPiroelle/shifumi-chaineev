import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  // chemins relatifs : le build marche aussi publié dans un sous-dossier (GitHub Pages…)
  base: "./",
  test: {
    environment: "jsdom",
  },
});
