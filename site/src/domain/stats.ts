import { MOVE_KEYS, PLAYER_IDS, zeroMoves } from "./moves";
import type { Match, Move, MoveCount, PerPlayer, PlayerId } from "./types";

export type MatrixKey = `${Move}|${Move}`;

export interface Stats {
  total: number;
  wins: PerPlayer<number>;
  draws: number;
  totalRounds: number;
  /** duels avec au moins une égalité */
  tieMatches: number;
  /** le duel avec le plus d'égalités */
  longestTie: Match | null;
  /** tous les coups joués, égalités comprises */
  moves: PerPlayer<MoveCount>;
  /** le coup de la manche gagnante */
  winningMoves: PerPlayer<MoveCount>;
  /** le premier coup de chaque duel */
  opening: PerPlayer<MoveCount>;
  /** nombre de manches par couple (coup de a, coup de b) */
  matrix: Record<MatrixKey, number>;
  /** après une égalité, le joueur garde-t-il son coup ? */
  afterTie: PerPlayer<{ keep: number; change: number }>;
  /** null = égalité au score */
  leader: PlayerId | null;
}

export function computeStats(matches: readonly Match[]): Stats {
  const matrix = {} as Record<MatrixKey, number>;
  MOVE_KEYS.forEach((x) => MOVE_KEYS.forEach((y) => (matrix[`${x}|${y}`] = 0)));
  const s: Stats = {
    total: matches.length,
    wins: { a: 0, b: 0 },
    draws: 0,
    totalRounds: 0,
    tieMatches: 0,
    longestTie: null,
    moves: { a: zeroMoves(), b: zeroMoves() },
    winningMoves: { a: zeroMoves(), b: zeroMoves() },
    opening: { a: zeroMoves(), b: zeroMoves() },
    matrix,
    afterTie: { a: { keep: 0, change: 0 }, b: { keep: 0, change: 0 } },
    leader: null,
  };

  for (const m of matches) {
    if (m.winner) s.wins[m.winner]++;
    else s.draws++;
    s.totalRounds += m.rounds.length;
    if (m.ties > 0) s.tieMatches++;
    if (!s.longestTie || m.ties > s.longestTie.ties) s.longestTie = m;
    const first = m.rounds[0]!;
    s.opening.a[first.a]++;
    s.opening.b[first.b]++;
    const last = m.rounds[m.rounds.length - 1]!;
    if (m.winner) s.winningMoves[m.winner][last[m.winner]]++;
    m.rounds.forEach((r, i) => {
      s.moves.a[r.a]++;
      s.moves.b[r.b]++;
      s.matrix[`${r.a}|${r.b}`]++;
      const prev = m.rounds[i - 1];
      if (prev) PLAYER_IDS.forEach((p) => s.afterTie[p][r[p] === prev[p] ? "keep" : "change"]++);
    });
  }
  s.leader = s.wins.a === s.wins.b ? null : s.wins.a > s.wins.b ? "a" : "b";
  return s;
}

export interface Streaks {
  best: PerPlayer<number>;
  /** série en cours ; who = null après un nul ou sans duel */
  current: { who: PlayerId | null; n: number };
}

/** Victoires d'affilée, dans l'ordre chronologique. Un nul casse la série. */
export function computeStreaks(matches: readonly Match[]): Streaks {
  const best = { a: 0, b: 0 };
  let current: Streaks["current"] = { who: null, n: 0 };
  for (const m of matches) {
    if (!m.winner) {
      current = { who: null, n: 0 };
      continue;
    }
    current = current.who === m.winner ? { who: m.winner, n: current.n + 1 } : { who: m.winner, n: 1 };
    best[m.winner] = Math.max(best[m.winner], current.n);
  }
  return { best, current };
}

/** Victoires cumulées après chaque duel ; le premier point est 0 – 0. */
export function cumulativeWins(matches: readonly Match[]): PerPlayer<number>[] {
  const c = { a: 0, b: 0 };
  const points = [{ ...c }];
  for (const m of matches) {
    if (m.winner) c[m.winner]++;
    points.push({ ...c });
  }
  return points;
}
