/*
 * ============================================================
 *  DONNÉES DU LEADERBOARD SHIFUMI — LaChaineEv
 * ============================================================
 *
 *  C'est le seul fichier à modifier pour ajouter des shifumis.
 *
 *  players : les deux propriétaires de la chaîne.
 *            Garde les ids "a" et "b", change seulement name/color.
 *
 *  matches : un objet par shifumi.
 *    id       identifiant unique (texte libre)
 *    date     "AAAA-MM-JJ" (date de sortie de la vidéo)
 *    car      voiture essayée dans la vidéo
 *    video    { id, start, end, title }
 *               id    = l'ID YouTube (ce qu'il y a après "watch?v=")
 *               start = début de l'extrait, en secondes ou "mm:ss" / "h:mm:ss"
 *               end   = fin de l'extrait (facultatif)
 *    stake    l'enjeu du shifumi (facultatif) : "qui conduit", "qui paie le café"...
 *    rounds   la suite des manches, dans l'ordre.
 *               Chaque manche = { a: coup, b: coup }
 *               coups possibles : "pierre", "feuille", "ciseaux"
 *               Toutes les manches sauf la dernière doivent être des égalités ;
 *               la dernière désigne le gagnant. Si la dernière est aussi une
 *               égalité, le duel est compté comme nul (pas de vainqueur).
 *    note     commentaire libre (facultatif)
 *
 */

window.SHIFUMI_DATA = {
  players: [
    { id: "a", name: "JC", color: "#3ee6a8" },
    { id: "b", name: "Alex", color: "#ff8a3d" },
  ],

  matches: [
    // Colle ici les duels exportés depuis tools/review.html
  ],
};
