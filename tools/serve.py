#!/usr/bin/env python3
"""
Serveur local des outils : sert le projet comme `python3 -m http.server`,
et permet à tools/review.html d'ajouter ou mettre à jour directement les duels dans
site/src/data/shifumi.json.

  python3 tools/serve.py            # http://localhost:8765/
  python3 tools/serve.py --port 9000

N'écoute que sur 127.0.0.1 et n'accepte les écritures que depuis la page servie par
lui-même : rien n'est exposé sur le réseau.
"""

import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "site" / "src" / "data" / "shifumi.json"


def write_matches(entries):
    """entries : [{id, match, replace}] ; replace = remplace le duel de même id au lieu de l'ajouter"""
    data = json.loads(DATA.read_text(encoding="utf-8"))
    matches = data["matches"]
    for e in entries:
        match = e["match"]
        if not isinstance(match, dict) or match.get("id") != e["id"]:
            raise ValueError("duel mal formé")
        if e.get("replace"):
            found = [i for i, m in enumerate(matches) if m.get("id") == e["id"]]
            if len(found) != 1:
                raise ValueError(f"duel {e['id']} introuvable (ou en double) dans shifumi.json")
            matches[found[0]] = match
        else:
            if any(m.get("id") == e["id"] for m in matches):
                raise ValueError(f"duel {e['id']} déjà présent dans shifumi.json")
            matches.append(match)
    # tout est calculé avant d'écrire : une erreur ne laisse pas le fichier à moitié modifié
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/api/matches":
            return self.reply(404, {"error": "inconnu"})
        host = self.headers.get("Host", "")
        if self.headers.get("Origin") not in (f"http://{host}", None) or \
                self.headers.get("Content-Type") != "application/json":
            return self.reply(403, {"error": "requête refusée"})
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            entries = body["entries"]
            if not isinstance(entries, list) or not entries:
                raise ValueError("aucun duel à écrire")
            write_matches(entries)
        except (ValueError, KeyError, TypeError, AttributeError) as e:
            return self.reply(400, {"error": str(e)})
        self.reply(200, {"ok": True})

    def reply(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        # shifumi.json et candidates.json changent souvent : pas de cache
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, directory=str(ROOT)))
    print(f"Validation : http://localhost:{args.port}/tools/review.html")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
