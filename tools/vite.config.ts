import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { toolsApi } from "./server/api.ts";

const site = fileURLToPath(new URL("../site/src", import.meta.url));

export default defineConfig({
  plugins: [
    vue(),
    toolsApi({
      shifumi: `${site}/data/shifumi.json`,
      candidates: fileURLToPath(new URL("candidates.json", import.meta.url)),
    }),
  ],
  // les types, règles du jeu et le style viennent du site
  resolve: { alias: { "@site": site } },
  server: {
    // la page écrit dans shifumi.json : rien n'est exposé sur le réseau
    // localhost (et pas 127.0.0.1) : la progression est gardée par adresse dans le navigateur
    host: "localhost",
    port: 8765,
    strictPort: true,
    fs: { allow: [".", site] },
  },
});
