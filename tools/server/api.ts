import { readFileSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import type { RawMatch, ShifumiData } from "../../site/src/domain/types.ts";

/** un duel à écrire ; replace = remplace le duel de même id au lieu de l'ajouter */
export interface MatchEntry {
  id: string;
  replace?: boolean;
  match: RawMatch;
}

/** Applique les entrées à `data` (modifié en place). Tout est vérifié avant : une erreur ne change rien. */
export function applyEntries(data: ShifumiData, entries: unknown): void {
  if (!Array.isArray(entries) || !entries.length) throw new Error("aucun duel à écrire");
  const matches = [...data.matches];
  for (const e of entries as MatchEntry[]) {
    const match = e?.match;
    if (!match || typeof match !== "object" || match.id !== e.id) throw new Error("duel mal formé");
    if (e.replace) {
      const found = matches.flatMap((m, i) => (m.id === e.id ? [i] : []));
      if (found.length !== 1) throw new Error(`duel ${e.id} introuvable (ou en double) dans shifumi.json`);
      matches[found[0]!] = match;
    } else {
      if (matches.some((m) => m.id === e.id)) throw new Error(`duel ${e.id} déjà présent dans shifumi.json`);
      matches.push(match);
    }
  }
  data.matches = matches;
}

export const formatJson = (data: unknown, indent: number) => JSON.stringify(data, null, indent) + "\n";

function reply(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  // shifumi.json et candidates.json changent souvent : pas de cache
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * L'API locale de la page de validation, branchée sur le serveur de dev Vite :
 *   GET  /api/shifumi     les duels publiés (site/src/data/shifumi.json)
 *   GET  /api/candidates  les passages détectés (tools/candidates.json)
 *   POST /api/matches     ajoute ou remplace des duels dans shifumi.json
 * Les écritures ne sont acceptées que depuis la page servie par ce même serveur.
 */
export function toolsApi(files: { shifumi: string; candidates: string }): Plugin {
  return {
    name: "shifumi-tools-api",
    configureServer(server) {
      server.middlewares.use("/api", async (req, res) => {
        const path = req.url?.split("?")[0];
        try {
          if (req.method === "GET" && path === "/shifumi")
            return reply(res, 200, JSON.parse(readFileSync(files.shifumi, "utf-8")));
          if (req.method === "GET" && path === "/candidates")
            return reply(res, 200, JSON.parse(readFileSync(files.candidates, "utf-8")));
        } catch {
          return reply(res, 404, { error: "fichier introuvable" });
        }
        if (req.method !== "POST" || path !== "/matches") return reply(res, 404, { error: "inconnu" });

        const host = req.headers.host ?? "";
        const origin = req.headers.origin;
        if ((origin !== undefined && origin !== `http://${host}`) || req.headers["content-type"] !== "application/json")
          return reply(res, 403, { error: "requête refusée" });
        try {
          const body = JSON.parse(await readBody(req)) as { entries?: unknown };
          const data = JSON.parse(readFileSync(files.shifumi, "utf-8")) as ShifumiData;
          applyEntries(data, body.entries);
          writeFileSync(files.shifumi, formatJson(data, 2), "utf-8");
        } catch (e) {
          return reply(res, 400, { error: e instanceof Error ? e.message : String(e) });
        }
        reply(res, 200, { ok: true });
      });
    },
  };
}
