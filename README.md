# Chifoumi Leaderboard — LaChaineEv

Site qui recense les chifoumis de LaChaineEv : Vue 3 + Vite + TypeScript, publié en site statique.

```
site/    le site public (projet Vue) — seul son build (site/dist/) est mis en ligne
tools/   outils privés : détection automatique + page de validation (jamais publiés)
```

## Les données

Tout est dans [`site/src/data/shifumi.json`](site/src/data/shifumi.json) : un objet par duel, avec l'ID de la vidéo YouTube,
le timestamp de l'extrait (`start` / `end`) et la suite des manches (égalités comprises).
Le format de chaque champ est documenté dans [`site/src/domain/types.ts`](site/src/domain/types.ts).
Les stats, le classement et le coach se recalculent tout seuls.

`npm test` vérifie chaque duel du fichier (coups valides, seule la dernière manche a un gagnant, dates, temps,
pas d'id en double ni de doublon probable dans une même vidéo).

## Le site (site/)

Prérequis : Node.js 22 ou plus récent. Une fois : `cd site && npm install`.

```bash
npm run dev        # site en local avec rechargement auto : http://localhost:5173/
npm run check      # types + lint + tests, à lancer avant de commiter
npm run build      # build de production dans site/dist/
```

Aussi : `npm run test:watch`, `npm run format` (Prettier), `npm run preview` (sert le build).

Organisation de `site/src/` :

- `domain/` — la logique pure, sans Vue : types, règles du jeu, stats, coach, filtres. Chaque fichier a ses tests `*.test.ts`.
- `composables/` — l'état partagé côté Vue : `useShifumi` (données + stats), `useDuelFilter` (liste filtrée),
  `useDuelLink` (le duel ouvert, synchronisé avec `#duel-<id>`).
- `components/` — l'affichage : tableau des scores, cartes de stats (`stats/`), liste et lecteur (`duels/`), coach (`coach/`).
- `data/shifumi.json` — les duels.
- `styles/main.css` — le style global (aussi utilisé par la page de validation).

Pour ajouter une stat : la calculer dans `domain/stats.ts` (avec un test), puis l'afficher dans un composant de `components/stats/`.

## Les outils (tools/)

```bash
python3 tools/serve.py
```

C'est un `python3 -m http.server 8765` qui permet en plus à la page de validation d'écrire dans `shifumi.json`.
Pendant que `npm run dev` tourne, le site se met à jour tout seul après un enregistrement.

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

**Valider** : lancer `python3 tools/serve.py` puis ouvrir http://localhost:8765/tools/review.html.
Pour chaque passage : regarder l'extrait, caler début/fin (📍), saisir les coups de chaque manche, puis « Valider » ou « Pas un chifoumi ».
Le bouton « Exporter » puis « Enregistrer » écrit les duels validés directement dans `site/src/data/shifumi.json`
(nécessite `tools/serve.py`) ; un duel déjà publié et modifié dans la page est remplacé. « Copier » donne les mêmes entrées à coller à la main.
Si `shifumi.json` a été modifié à la main, la page reprend ces valeurs ; un duel modifié des deux côtés est signalé et n'est pas exporté.
L'onglet « Sans détection » liste les vidéos où aucun mot-clé n'a été trouvé : marque-les « vérifiée » ou ajoute à la main un chifoumi raté.
La progression est gardée dans le navigateur (localStorage) : utilise toujours le même navigateur et la même adresse.

## Mettre en ligne

Le site se publie en statique : la commande de build est `npm run build`, le dossier publié `site/dist`.

- **Netlify / Cloudflare Pages** : « Base directory » = `site`, « Build command » = `npm run build`,
  « Publish directory » / « Build output directory » = `dist`.
- **GitHub Pages** (en place) : le workflow `.github/workflows/deploy.yml` vérifie (`npm run check`), construit
  et publie le site à chaque push sur `main`, ou à la demande depuis l'onglet Actions. À activer une fois dans
  Settings → Pages → Source = « GitHub Actions ».
- **Hébergement FTP / autre** : lancer `npm run build` et n'envoyer que le contenu de `site/dist/`.

Le build utilise des chemins relatifs : il marche aussi publié dans un sous-dossier.
Le dépôt Git peut contenir `tools/` sans risque : il n'est jamais inclus dans le build.

## Lien direct vers un duel

`#duel-<id>` à la fin de l'adresse du site ouvre directement le lecteur sur ce duel (pratique pour partager une action).
