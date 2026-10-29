export type Move = "pierre" | "feuille" | "ciseaux";

/** Les deux propriétaires de la chaîne : toujours "a" et "b". */
export type PlayerId = "a" | "b";

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
}

/** Une manche : le coup de chaque joueur. */
export interface Round {
  a: Move;
  b: Move;
}

/** Un duel tel qu'il est écrit dans src/data/shifumi.json. */
export interface RawMatch {
  /** identifiant unique (texte libre), utilisé dans le lien #duel-<id> */
  id: string;
  /** "AAAA-MM-JJ", date de sortie de la vidéo */
  date: string;
  /** voiture essayée dans la vidéo */
  car: string;
  video: {
    /** l'ID YouTube (ce qu'il y a après "watch?v=") */
    id: string;
    /** début de l'extrait, en secondes ou "mm:ss" / "h:mm:ss" */
    start: string | number;
    /** fin de l'extrait (facultatif) */
    end?: string | number;
    title: string;
  };
  /** l'enjeu du chifoumi (facultatif) : "qui conduit", "qui paie le café"… */
  stake?: string;
  /**
   * La suite des manches, dans l'ordre. Toutes sauf la dernière sont des égalités ;
   * la dernière désigne le gagnant. Si elle est aussi une égalité, le duel est nul.
   */
  rounds: Round[];
  /** commentaire libre (facultatif) */
  note?: string;
}

export interface ShifumiData {
  players: [Player, Player];
  matches: RawMatch[];
}

/** Un duel prêt à afficher : temps en secondes, gagnant et égalités calculés. */
export interface Match extends RawMatch {
  /** null = duel nul (fini sur une égalité) */
  winner: PlayerId | null;
  ties: number;
  start: number | null;
  end: number | null;
}

export type MoveCount = Record<Move, number>;
export type PerPlayer<T> = Record<PlayerId, T>;
