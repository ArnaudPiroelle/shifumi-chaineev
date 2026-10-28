# Shifumi Leaderboard — LaChaineEv

Site statique (HTML/CSS/JS, aucune dépendance) qui recense les shifumis de LaChaineEv.

```
site/    le site public — c'est le SEUL dossier à mettre en ligne
tools/   outils privés : détection automatique + page de validation (jamais publiés)
```

## Ajouter un shifumi

Tout se passe dans [`site/data.js`](site/data.js) : un objet par duel, avec l'ID de la vidéo YouTube,
le timestamp de l'extrait (`start` / `end`) et la suite des manches (égalités comprises).
Les stats, le classement et le coach se recalculent tout seuls.

## Lancer en local

Les lecteurs YouTube intégrés refusent souvent de se lancer depuis `file://`, il faut servir le projet.
Depuis la racine du projet (pour avoir accès au site **et** aux outils) :

```bash
python3 tools/serve.py
```

C'est un `python3 -m http.server 8765` qui permet en plus à la page de validation d'écrire dans `site/data.js`.

- le site : http://localhost:8765/site/
- la validation : http://localhost:8765/tools/review.html

## Détection automatique (sous-titres YouTube)

Le script [`tools/detect.py`](tools/detect.py) récupère les sous-titres automatiques de toutes les vidéos
de la chaîne et repère les passages où l'on entend « chifoumi », « pierre feuille ciseaux »…
Les passages trouvés vont dans `tools/candidates.json`, puis se valident à la main dans la page de validation.

**Installation (une fois)** : yt-dlp dans un environnement Python dédié

```bash
python3 -m venv tools/.venv && tools/.venv/bin/pip install yt-dlp
```

**Lancer la détection** (incrémental : seules les nouvelles vidéos sont téléchargées, le reste vient de `tools/cache/`)

```bash
python3 tools/detect.py
```

Options utiles : `--limit 20` (les 20 dernières vidéos), `--video <ID>`, `--offline` (recalcule sans réseau,
pratique après avoir modifié les mots-clés), `--cookies-from-browser firefox` si YouTube demande de prouver qu'on n'est pas un robot.
Pense à mettre yt-dlp à jour de temps en temps (`tools/.venv/bin/pip install -U yt-dlp`), YouTube change souvent.

**Valider** : ouvrir http://localhost:8765/tools/review.html.
Pour chaque passage : regarder l'extrait, caler début/fin (📍), saisir les coups de chaque manche, puis « Valider » ou « Pas un shifumi ».
Le bouton « Exporter » puis « Ajouter à data.js » écrit les duels validés directement dans `site/data.js`
(nécessite `tools/serve.py`). « Copier » donne les mêmes entrées à coller à la main.
L'onglet « Sans détection » liste les vidéos où aucun mot-clé n'a été trouvé : marque-les « vérifiée » ou ajoute à la main un shifumi raté.
La progression est gardée dans le navigateur (localStorage) : utilise toujours le même navigateur et la même adresse.

## Mettre en ligne

Publier **uniquement le dossier `site/`** :

- **Netlify / Cloudflare Pages** : « Publish directory » / « Build output directory » = `site` (pas de commande de build).
- **GitHub Pages** : déployer via GitHub Actions avec `actions/upload-pages-artifact` et `path: site`
  (le mode « Deploy from a branch » ne propose que la racine ou `docs/`).
- **Hébergement FTP / autre** : n'envoyer que le contenu de `site/`.

Le dépôt Git peut contenir `tools/` sans risque tant que le site publié pointe sur `site/`.

## Lien direct vers un duel

`index.html#duel-<id>` ouvre directement le lecteur sur ce duel (pratique pour partager une action).
