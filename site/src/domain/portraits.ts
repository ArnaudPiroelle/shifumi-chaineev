import type { PlayerId } from "./types";

/** "loose" : le nom des fichiers d'images, src/assets/players/<joueur>_<humeur>.webp */
export type Mood = "win" | "loose";

/** Le joueur en tête est content, l'autre déçu ; à égalité au score, les deux sont contents. */
export const moodOf = (id: PlayerId, leader: PlayerId | null): Mood =>
  leader === null || leader === id ? "win" : "loose";
