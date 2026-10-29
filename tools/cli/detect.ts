/**
 * Détecte les chifoumis dans les vidéos de LaChaineEv à partir des sous-titres automatiques YouTube.
 *
 *   1. liste les vidéos de la chaîne
 *   2. télécharge les sous-titres auto (fr) des vidéos pas encore vues -> tools/cache/
 *   3. cherche les mots-clés (shifumi, chifoumi, pierre feuille ciseaux…)
 *   4. écrit les passages trouvés dans tools/candidates.json
 *
 * Les candidats se valident ensuite dans la page de validation (npm run dev).
 * Dépendance : yt-dlp (cherché dans tools/.venv puis dans le PATH).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { delimiter, join, relative } from "node:path";
import { parseArgs } from "node:util";
import { detect, parseVtt, type Detection } from "./detection.ts";

const USAGE = `Usage : npm run detect -- [options]

  npm run detect                              toute la chaîne (incrémental)
  npm run detect -- --limit 30                les 30 dernières vidéos seulement
  npm run detect -- --video UZdpqylkFcM       une vidéo précise (répétable)
  npm run detect -- --offline                 recalcule depuis le cache, sans réseau
  npm run detect -- --cookies-from-browser firefox   si YouTube bloque

Options :
  --limit N                    ne regarder que les N vidéos les plus récentes
  --video ID                   ID d'une vidéo précise (répétable)
  --offline                    ne rien télécharger, recalculer depuis le cache
  --retry                      retenter les vidéos sans sous-titres
  --batch N                    vidéos par appel yt-dlp (défaut 15)
  --cookies-from-browser NOM   passer les cookies d'un navigateur à yt-dlp (chrome, firefox, safari…)`;

const CHANNEL_URL = "https://www.youtube.com/@LaChaineEv/videos";

const TOOLS = join(import.meta.dirname, "..");
const CACHE = join(TOOLS, "cache");
const SUBS = join(CACHE, "subs");
const INDEX = join(CACHE, "videos.json");
const OUTPUT = join(TOOLS, "candidates.json");

interface VideoInfo {
  title: string | null;
  date: string | null;
  duration: number | null;
  subs?: boolean;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// ---------------------------------------------------------------- yt-dlp

function findYtDlp(): string {
  const venv = join(TOOLS, ".venv", "bin", "yt-dlp");
  if (existsSync(venv)) return venv;
  const found = (process.env.PATH ?? "")
    .split(delimiter)
    .map((dir) => join(dir, "yt-dlp"))
    .find(existsSync);
  return found ?? fail("yt-dlp introuvable. Installe-le : voir le README (section Détection automatique).");
}

function runYtDlp(args: string[], extra: string[]): string {
  const proc = spawnSync(findYtDlp(), ["--ignore-errors", "--no-warnings", ...extra, ...args], {
    encoding: "utf-8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (proc.error) fail(String(proc.error));
  if (proc.status !== 0 && proc.status !== 1) console.error(proc.stderr.trim()); // 1 = certaines vidéos en erreur, on continue
  for (const line of proc.stderr.split("\n")) if (line.includes("ERROR")) console.error("  " + line.trim());
  return proc.stdout;
}

function listChannel(limit: number | undefined, extra: string[]): { id: string; title: string }[] {
  const args = ["--flat-playlist", "--print", "%(id)s\t%(title)s"];
  if (limit) args.push("--playlist-end", String(limit));
  return runYtDlp([...args, CHANNEL_URL], extra)
    .split("\n")
    .map((line) => {
      const tab = line.indexOf("\t");
      return tab < 0 ? { id: line, title: "" } : { id: line.slice(0, tab), title: line.slice(tab + 1) };
    })
    .filter((v) => v.id);
}

/** Télécharge les sous-titres auto fr + date/durée/titre. */
function fetchSubs(ids: string[], extra: string[]): Record<string, VideoInfo> {
  mkdirSync(SUBS, { recursive: true });
  const args = [
    "--skip-download",
    "--no-simulate",
    "--write-auto-subs",
    "--write-subs",
    "--sub-langs",
    "fr-orig,fr",
    "--sub-format",
    "vtt",
    "-o",
    join(SUBS, "%(id)s.%(ext)s"),
    "--print",
    "%(id)s\t%(upload_date)s\t%(duration)s\t%(title)s",
    "--sleep-requests",
    "0.5",
  ];
  const urls = ids.map((id) => "https://www.youtube.com/watch?v=" + id);
  const meta: Record<string, VideoInfo> = {};
  for (const line of runYtDlp([...args, ...urls], extra).split("\n")) {
    const [vid, date, dur, ...rest] = line.split("\t");
    if (vid === undefined || date === undefined || dur === undefined || !rest.length) continue;
    meta[vid] = {
      title: rest.join("\t"),
      date: /^\d{8}$/.test(date) ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}` : null,
      duration: /^[\d.]+$/.test(dur) ? Math.trunc(Number(dur)) : null,
    };
  }
  return meta;
}

/** fr-orig = transcription d'origine (préférée), sinon fr */
function subFile(vid: string): string | undefined {
  return [`${vid}.fr-orig.vtt`, `${vid}.fr.vtt`].map((name) => join(SUBS, name)).find(existsSync);
}

// ---------------------------------------------------------------- main

function loadIndex(): Record<string, VideoInfo> {
  return existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, "utf-8")) : {};
}

function saveIndex(index: Record<string, VideoInfo>) {
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(INDEX, JSON.stringify(index, null, 1), "utf-8");
}

function parseOptions() {
  try {
    const { values } = parseArgs({
      options: {
        limit: { type: "string" },
        video: { type: "string", multiple: true, default: [] },
        offline: { type: "boolean", default: false },
        retry: { type: "boolean", default: false },
        batch: { type: "string", default: "15" },
        "cookies-from-browser": { type: "string" },
        help: { type: "boolean", short: "h", default: false },
      },
    });
    if (values.help) {
      console.log(USAGE);
      process.exit(0);
    }
    const int = (name: string, v: string | undefined) => {
      if (v === undefined) return undefined;
      const n = Number(v);
      return Number.isInteger(n) && n > 0 ? n : fail(`--${name} : nombre entier attendu, pas « ${v} »`);
    };
    return { ...values, limit: int("limit", values.limit), batch: int("batch", values.batch)! };
  } catch (e) {
    fail(`${e instanceof Error ? e.message : String(e)}\n\n${USAGE}`);
  }
}

function main() {
  const args = parseOptions();
  const cookies = args["cookies-from-browser"];
  const extra = cookies ? ["--cookies-from-browser", cookies] : [];
  const index = loadIndex();

  if (!args.offline) {
    let videos: { id: string; title: string }[];
    if (args.video.length) {
      videos = args.video.map((id) => ({ id, title: index[id]?.title ?? "" }));
    } else {
      console.log("Liste des vidéos de la chaîne…");
      videos = listChannel(args.limit, extra);
      console.log(`  ${videos.length} vidéo(s)`);
    }

    const todo = videos
      .map((v) => v.id)
      .filter((id) => !(id in index) || args.video.length || (args.retry && !index[id]!.subs));
    console.log(`${todo.length} vidéo(s) à analyser`);
    for (let i = 0; i < todo.length; i += args.batch) {
      const chunk = todo.slice(i, i + args.batch);
      console.log(`  sous-titres ${i + 1}–${i + chunk.length} / ${todo.length}…`);
      const meta = fetchSubs(chunk, extra);
      for (const vid of chunk) {
        const info = meta[vid] ?? {
          title: videos.find((v) => v.id === vid)?.title ?? "",
          date: null,
          duration: null,
        };
        info.subs = subFile(vid) !== undefined;
        index[vid] = info;
      }
      saveIndex(index);
    }
  }

  type Candidate = { id: string; videoId: string; title: string | null; date: string | null } & Detection;
  const candidates: Candidate[] = [];
  const undetected: (Omit<VideoInfo, "subs"> & { videoId: string; subs: boolean })[] = [];
  let noSubs = 0;
  for (const [vid, info] of Object.entries(index)) {
    const f = subFile(vid);
    const found = f ? detect(parseVtt(readFileSync(f, "utf-8"))) : [];
    if (!f) noSubs++;
    if (!found.length) {
      // à vérifier à la main : rien trouvé, ou pas de sous-titres du tout
      undetected.push({
        videoId: vid,
        title: info.title ?? null,
        date: info.date ?? null,
        duration: info.duration ?? null,
        subs: !!f,
      });
    }
    for (const d of found) {
      candidates.push({
        id: `${vid}@${d.start}`,
        videoId: vid,
        title: info.title ?? null,
        date: info.date ?? null,
        ...d,
      });
    }
  }

  const byDateDesc = (x: { date: string | null }, y: { date: string | null }) =>
    (y.date ?? "") < (x.date ?? "") ? -1 : (y.date ?? "") > (x.date ?? "") ? 1 : 0;
  candidates.sort((x, y) => byDateDesc(x, y) || y.start - x.start);
  undetected.sort(byDateDesc);
  const generated = new Date().toISOString().slice(0, 19) + "+00:00";
  const output = { generated, videos: Object.keys(index).length, candidates, undetected };
  writeFileSync(OUTPUT, JSON.stringify(output, null, 1), "utf-8");

  const nVideos = new Set(candidates.map((c) => c.videoId)).size;
  console.log(
    `\n${candidates.length} passage(s) candidat(s) dans ${nVideos} vidéo(s)` +
      ` — ${Object.keys(index).length} vidéos en cache, ${noSubs} sans sous-titres,` +
      ` ${undetected.length} sans détection (à vérifier à la main).`,
  );
  console.log(`→ ${relative(join(TOOLS, ".."), OUTPUT)} ; valide-les avec npm run dev (http://localhost:8765/)`);
}

main();
