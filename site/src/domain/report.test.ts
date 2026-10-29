/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { describeMatch, newIssueUrl, reportIssueUrl, youtubeUrl } from "./report";
import { prepareMatches } from "./matches";
import type { Player, PlayerId } from "./types";

const players: Record<PlayerId, Player> = {
  a: { id: "a", name: "JC", color: "#3ee6a8" },
  b: { id: "b", name: "Alex", color: "#ff8a3d" },
};
const [match] = prepareMatches([
  {
    id: "abc-1954",
    date: "2026-10-05",
    car: "Cupra Raval",
    video: { id: "abc", start: "32:34", end: "32:43", title: "Essai Cupra Raval" },
    rounds: [
      { a: "pierre", b: "pierre" },
      { a: "feuille", b: "pierre" },
    ],
  },
]);

describe("report", () => {
  it("cale le lien YouTube sur le début de l'extrait", () => {
    expect(youtubeUrl(match!)).toBe("https://www.youtube.com/watch?v=abc&t=1954s");
  });

  it("décrit le duel tel que le site l'affiche", () => {
    expect(describeMatch(match!, players)).toBe(
      [
        "Cupra Raval — 5 oct. 2026",
        "Manche 1 : JC pierre, Alex pierre → égalité",
        "Manche 2 : JC feuille, Alex pierre → JC",
        "Victoire de JC",
      ].join("\n"),
    );
  });

  it("pré-remplit le formulaire d'issue, un paramètre par champ", () => {
    const url = new URL(reportIssueUrl("moi/depot", match!, players));
    expect(url.origin + url.pathname).toBe("https://github.com/moi/depot/issues/new");
    const p = url.searchParams;
    expect(p.get("template")).toBe("erreur-duel.yml");
    expect(p.get("title")).toBe("[Erreur] Cupra Raval — 5 oct. 2026");
    expect(p.get("video")).toBe("https://www.youtube.com/watch?v=abc&t=1954s");
    expect(p.get("debut")).toBe("32:34");
    expect(p.get("fin")).toBe("32:43");
    expect(p.get("duel")).toBe("abc-1954");
    expect(p.get("actuel")).toContain("Victoire de JC");
  });

  it("ne pré-remplit que des champs qui existent dans le formulaire", () => {
    // le formulaire vit hors de site/ (dossier où tournent les tests), que Vite ne sert pas : on le lit directement
    const template = readFileSync(`${process.cwd()}/../.github/ISSUE_TEMPLATE/erreur-duel.yml`, "utf8");
    const ids = [...template.matchAll(/^\s+id: (\w+)$/gm)].map((m) => m[1]);
    const params = [...new URL(reportIssueUrl("moi/depot", match!, players)).searchParams.keys()];
    expect(params.filter((k) => k !== "template" && k !== "title" && !ids.includes(k))).toEqual([]);
  });

  it("ouvre le formulaire vierge pour un chifoumi manquant", () => {
    expect(newIssueUrl("moi/depot")).toBe("https://github.com/moi/depot/issues/new?template=erreur-duel.yml");
  });
});
