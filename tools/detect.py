#!/usr/bin/env python3
"""
Détecte les shifumis dans les vidéos de LaChaineEv à partir des sous-titres
automatiques YouTube.

  1. liste les vidéos de la chaîne
  2. télécharge les sous-titres auto (fr) des vidéos pas encore vues -> tools/cache/
  3. cherche les mots-clés (shifumi, chifoumi, pierre feuille ciseaux…)
  4. écrit les passages trouvés dans tools/candidates.json

Les candidats se valident ensuite dans tools/review.html.

Exemples :
  python3 tools/detect.py                  # toute la chaîne (incrémental)
  python3 tools/detect.py --limit 30       # les 30 dernières vidéos seulement
  python3 tools/detect.py --video UZdpqylkFcM
  python3 tools/detect.py --offline        # recalcule depuis le cache, sans réseau
  python3 tools/detect.py --cookies-from-browser firefox   # si YouTube bloque

Dépendance : yt-dlp (cherché dans tools/.venv puis dans le PATH).
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

CHANNEL_URL = "https://www.youtube.com/@LaChaineEv/videos"

TOOLS = Path(__file__).resolve().parent
CACHE = TOOLS / "cache"
SUBS = CACHE / "subs"
INDEX = CACHE / "videos.json"
OUTPUT = TOOLS / "candidates.json"

# Mots-clés, appliqués sur un texte en minuscules et sans accents.
# "fort" = quasi certain d'être un shifumi ; "coup" = un coup isolé, qui ne compte
# que s'il y en a au moins deux différents dans la même fenêtre.
STRONG = [
    re.compile(r"\b(?:s|c)h?[iy]+[\s-]*f+(?:ou|o|u)+[\s-]*mi+s?\b"),          # shifumi, chifoumi, chi fou mi
    re.compile(r"\bpierre\W+(?:\w+\W+){0,2}?(?:feuille|papier)\b"),             # pierre feuille / pierre, papier
    re.compile(r"\b(?:feuille|papier)\W+(?:\w+\W+){0,2}?ciseaux?\b"),
    re.compile(r"\bpierre\W+(?:\w+\W+){0,2}?ciseaux?\b"),
]
MOVE = re.compile(r"\b(pierre|feuille|papier|ciseaux?)\b")
MOVE_NORM = {"papier": "feuille", "ciseau": "ciseaux"}

CLUSTER_GAP = 45   # s : deux détections plus proches que ça = même passage
LEAD_IN = 8        # s : l'extrait démarre un peu avant le premier mot-clé
TAIL = 20          # s : … et finit un peu après le dernier


# ---------------------------------------------------------------- yt-dlp

def find_ytdlp():
    venv = TOOLS / ".venv" / "bin" / "yt-dlp"
    if venv.exists():
        return str(venv)
    found = shutil.which("yt-dlp")
    if not found:
        sys.exit("yt-dlp introuvable. Installe-le : voir le README (section Détection automatique).")
    return found


def run_ytdlp(args, extra):
    cmd = [find_ytdlp(), "--ignore-errors", "--no-warnings", *extra, *args]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode not in (0, 1):  # 1 = certaines vidéos en erreur, on continue
        print(proc.stderr.strip(), file=sys.stderr)
    for line in proc.stderr.splitlines():
        if "ERROR" in line:
            print("  " + line.strip(), file=sys.stderr)
    return proc.stdout


def list_channel(limit, extra):
    args = ["--flat-playlist", "--print", "%(id)s\t%(title)s"]
    if limit:
        args += ["--playlist-end", str(limit)]
    out = run_ytdlp(args + [CHANNEL_URL], extra)
    videos = []
    for line in out.splitlines():
        vid, _, title = line.partition("\t")
        if vid:
            videos.append({"id": vid, "title": title})
    return videos


def fetch_subs(ids, extra):
    """Télécharge les sous-titres auto fr + date/durée/titre. Retourne {id: meta}."""
    SUBS.mkdir(parents=True, exist_ok=True)
    args = [
        "--skip-download", "--no-simulate",
        "--write-auto-subs", "--write-subs",
        "--sub-langs", "fr-orig,fr", "--sub-format", "vtt",
        "-o", str(SUBS / "%(id)s.%(ext)s"),
        "--print", "%(id)s\t%(upload_date)s\t%(duration)s\t%(title)s",
        "--sleep-requests", "0.5",
    ]
    urls = ["https://www.youtube.com/watch?v=" + i for i in ids]
    out = run_ytdlp(args + urls, extra)
    meta = {}
    for line in out.splitlines():
        parts = line.split("\t", 3)
        if len(parts) == 4:
            vid, date, dur, title = parts
            meta[vid] = {
                "title": title,
                "date": f"{date[:4]}-{date[4:6]}-{date[6:]}" if re.fullmatch(r"\d{8}", date) else None,
                "duration": int(float(dur)) if re.fullmatch(r"[\d.]+", dur) else None,
            }
    return meta


def sub_file(vid):
    # fr-orig = transcription d'origine (préférée), sinon fr
    for name in (f"{vid}.fr-orig.vtt", f"{vid}.fr.vtt"):
        p = SUBS / name
        if p.exists():
            return p
    return None


# ---------------------------------------------------------------- parsing VTT

TS = r"(\d+):(\d{2}):(\d{2})\.(\d{3})"
CUE_RE = re.compile(TS + r" --> " + TS)
INLINE_RE = re.compile(r"<" + TS + r">")


def secs(h, m, s, ms):
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def normalize(s):
    s = unicodedata.normalize("NFKD", s.lower())
    return "".join(c for c in s if not unicodedata.combining(c))


def parse_vtt(path):
    """Retourne une liste de (temps_en_s, mot), sans les répétitions des sous-titres auto."""
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    has_inline = any("<c>" in l for l in lines)
    words, last_text, cue_start = [], None, 0.0
    for line in lines:
        m = CUE_RE.match(line)
        if m:
            cue_start = secs(*m.groups()[:4])
            continue
        if not line.strip() or line.startswith(("WEBVTT", "Kind:", "Language:")):
            continue
        if has_inline:
            # sous-titres auto : seules les lignes avec horodatage par mot sont nouvelles
            if "<c>" not in line and not INLINE_RE.search(line):
                continue
            t = cue_start
            for chunk in re.split(r"(<\d+:\d{2}:\d{2}\.\d{3}>)", line):
                tm = INLINE_RE.fullmatch(chunk)
                if tm:
                    t = secs(*tm.groups())
                    continue
                for w in re.sub(r"<[^>]+>", "", chunk).split():
                    words.append((t, w))
        else:
            text = re.sub(r"<[^>]+>", "", line).strip()
            if text and text != last_text:
                words.extend((cue_start, w) for w in text.split())
                last_text = text
    return words


# ---------------------------------------------------------------- détection

def detect(words):
    if not words:
        return []
    # texte normalisé + correspondance position -> temps
    offsets, parts, pos = [], [], 0
    for t, w in words:
        n = normalize(w)
        offsets.append((pos, t))
        parts.append(n)
        pos += len(n) + 1
    text = " ".join(parts)

    def time_at(char):
        lo, hi = 0, len(offsets) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if offsets[mid][0] <= char:
                lo = mid
            else:
                hi = mid - 1
        return offsets[lo][1]

    hits = []  # (temps, type, texte)
    for rx in STRONG:
        for m in rx.finditer(text):
            hits.append((time_at(m.start()), "fort", m.group(0)))
    for m in MOVE.finditer(text):
        w = MOVE_NORM.get(m.group(1), m.group(1))
        hits.append((time_at(m.start()), "coup", w))
    hits.sort()

    clusters = []
    for h in hits:
        if clusters and h[0] - clusters[-1][-1][0] <= CLUSTER_GAP:
            clusters[-1].append(h)
        else:
            clusters.append([h])

    results = []
    for c in clusters:
        strong = [h for h in c if h[1] == "fort"]
        moves = {h[2] for h in c if h[1] == "coup"}
        if not strong and len(moves) < 2:
            continue  # un "Pierre" isolé = sûrement un prénom
        score = 3 * len(strong) + len(moves)
        first, last = c[0][0], c[-1][0]
        start = max(0, int(first) - LEAD_IN)
        end = int(last) + TAIL
        snippet = " ".join(w for t, w in words if start - 5 <= t <= end)
        results.append({
            "start": start,
            "end": end,
            "score": score,
            "keywords": sorted({h[2] for h in strong} | moves),
            "snippet": snippet,
        })
    return results


# ---------------------------------------------------------------- main

def load_index():
    if INDEX.exists():
        return json.loads(INDEX.read_text(encoding="utf-8"))
    return {}


def save_index(index):
    CACHE.mkdir(parents=True, exist_ok=True)
    INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--limit", type=int, help="ne regarder que les N vidéos les plus récentes")
    ap.add_argument("--video", action="append", default=[], help="ID d'une vidéo précise (répétable)")
    ap.add_argument("--offline", action="store_true", help="ne rien télécharger, recalculer depuis le cache")
    ap.add_argument("--retry", action="store_true", help="retenter les vidéos sans sous-titres")
    ap.add_argument("--batch", type=int, default=15, help="vidéos par appel yt-dlp (défaut 15)")
    ap.add_argument("--cookies-from-browser", help="passer les cookies d'un navigateur à yt-dlp (chrome, firefox, safari…)")
    args = ap.parse_args()

    extra = ["--cookies-from-browser", args.cookies_from_browser] if args.cookies_from_browser else []
    index = load_index()

    if not args.offline:
        if args.video:
            videos = [{"id": v, "title": index.get(v, {}).get("title", "")} for v in args.video]
        else:
            print("Liste des vidéos de la chaîne…")
            videos = list_channel(args.limit, extra)
            print(f"  {len(videos)} vidéo(s)")

        todo = [v["id"] for v in videos
                if v["id"] not in index or args.video
                or (args.retry and not index[v["id"]].get("subs"))]
        print(f"{len(todo)} vidéo(s) à analyser")
        for i in range(0, len(todo), args.batch):
            chunk = todo[i:i + args.batch]
            print(f"  sous-titres {i + 1}–{i + len(chunk)} / {len(todo)}…", flush=True)
            meta = fetch_subs(chunk, extra)
            for vid in chunk:
                info = meta.get(vid) or {"title": next((v["title"] for v in videos if v["id"] == vid), ""), "date": None, "duration": None}
                info["subs"] = sub_file(vid) is not None
                index[vid] = info
            save_index(index)

    candidates, no_subs, undetected = [], 0, []
    for vid, info in index.items():
        f = sub_file(vid)
        found = detect(parse_vtt(f)) if f else []
        if not f:
            no_subs += 1
        if not found:
            # à vérifier à la main : rien trouvé, ou pas de sous-titres du tout
            undetected.append({"videoId": vid, "title": info.get("title"), "date": info.get("date"),
                               "duration": info.get("duration"), "subs": bool(f)})
        for d in found:
            candidates.append({"id": f"{vid}@{d['start']}", "videoId": vid,
                               "title": info.get("title"), "date": info.get("date"), **d})

    candidates.sort(key=lambda c: (c.get("date") or "", c["start"]), reverse=True)
    undetected.sort(key=lambda v: v.get("date") or "", reverse=True)
    OUTPUT.write_text(json.dumps({
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "videos": len(index),
        "candidates": candidates,
        "undetected": undetected,
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"\n{len(candidates)} passage(s) candidat(s) dans {len({c['videoId'] for c in candidates})} vidéo(s)"
          f" — {len(index)} vidéos en cache, {no_subs} sans sous-titres,"
          f" {len(undetected)} sans détection (à vérifier à la main).")
    print(f"→ {OUTPUT.relative_to(TOOLS.parent)} ; valide-les dans tools/review.html")


if __name__ == "__main__":
    main()
