import type { Move, MoveCount, PlayerId, Round } from "./types";

export const MOVES: Record<Move, { emoji: string; label: string; beats: Move }> = {
  pierre: { emoji: "✊", label: "Pierre", beats: "ciseaux" },
  feuille: { emoji: "✋", label: "Feuille", beats: "pierre" },
  ciseaux: { emoji: "✌️", label: "Ciseaux", beats: "feuille" },
};

export const MOVE_KEYS: readonly Move[] = ["pierre", "feuille", "ciseaux"];
export const PLAYER_IDS: readonly PlayerId[] = ["a", "b"];

export const isMove = (m: unknown): m is Move => typeof m === "string" && m in MOVES;

/** Le coup qui bat `m`. */
export const counterOf = (m: Move): Move => MOVE_KEYS.find((k) => MOVES[k].beats === m)!;

export const other = (id: PlayerId): PlayerId => (id === "a" ? "b" : "a");

/** Gagnant de la manche, ou null pour une égalité. */
export function roundResult(r: Round): PlayerId | null {
  if (r.a === r.b) return null;
  return MOVES[r.a].beats === r.b ? "a" : "b";
}

export const zeroMoves = (): MoveCount => ({ pierre: 0, feuille: 0, ciseaux: 0 });

export const sumMoves = (c: MoveCount): number => MOVE_KEYS.reduce((s, k) => s + c[k], 0);

/** Le coup le plus joué (le premier dans l'ordre pierre, feuille, ciseaux en cas d'égalité). */
export const favoriteMove = (c: MoveCount): Move => MOVE_KEYS.reduce((best, k) => (c[k] > c[best] ? k : best));
