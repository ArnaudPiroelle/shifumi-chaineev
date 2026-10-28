#!/usr/bin/env python3
"""
Serveur local du projet : sert le site et les outils comme `python3 -m http.server`,
et permet à tools/review.html d'ajouter ou mettre à jour directement les duels dans site/data.js.

  python3 tools/serve.py            # http://localhost:8765/
  python3 tools/serve.py --port 9000

N'écoute que sur 127.0.0.1 et n'accepte les écritures que depuis la page servie par
lui-même : rien n'est exposé sur le réseau.
"""

import argparse
import json
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "site" / "data.js"

# fin du tableau `matches` : la dernière ligne "  ]," juste avant le "};" final
MATCHES_END = re.compile(r"\n(\s*)\],\s*\n\};\s*$")


def entry_block(entry_id):
    # un duel tel qu'écrit par l'export : de "{" + id: "<id>", jusqu'au "}," de même indentation
    return re.compile(r"\n([ \t]*)\{[ \t]*\n\s*id:\s*" + re.escape(json.dumps(entry_id)) + r",.*?\n\1\},", re.S)


def write_matches(entries):
    """entries : [{id, code, replace}] ; replace = remplace le duel de même id au lieu de l'ajouter"""
    text = DATA.read_text(encoding="utf-8")
    for e in entries:
        code = e["code"].rstrip()
        if not isinstance(code, str) or not code.lstrip().startswith("{"):
            raise ValueError("duel mal formé")
        if e.get("replace"):
            found = list(entry_block(e["id"]).finditer(text))
            if len(found) != 1:
                raise ValueError(f"duel {e['id']} introuvable dans site/data.js")
            m = found[0]
            text = f"{text[:m.start()]}\n{code}{text[m.end():]}"
        else:
            m = MATCHES_END.search(text)
            if not m:
                raise ValueError("fin du tableau matches introuvable dans site/data.js")
            text = f"{text[:m.start()].rstrip(chr(10))}\n{code}\n{text[m.start() + 1:]}"
    # tout est calculé avant d'écrire : une erreur ne laisse pas data.js à moitié modifié
    DATA.write_text(text, encoding="utf-8")


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
        # data.js et candidates.json changent souvent : pas de cache
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, directory=str(ROOT)))
    print(f"Site : http://localhost:{args.port}/site/")
    print(f"Validation : http://localhost:{args.port}/tools/review.html")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
