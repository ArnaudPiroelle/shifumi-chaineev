import { describe, expect, it } from "vitest";
import type { RawMatch } from "@site/domain/types";
import {
  entryOf,
  exportCode,
  fieldsKey,
  fmt,
  guessCar,
  highlight,
  initialReview,
  isEdited,
  parseTime,
  pick,
  syncWithFile,
  toExport,
  validate,
  type Candidate,
  type Review,
} from "./review";

const cand = (over: Partial<Candidate> = {}): Candidate => ({
  id: "vid@100",
  videoId: "vid",
  title: "Essai Renault 5 : la meilleure ?",
  date: "2026-03-01",
  start: 100,
  end: 140,
  score: 3,
  keywords: ["chifoumi"],
  snippet: "on fait un chifoumi",
  ...over,
});

const published = (over: Partial<RawMatch> = {}): RawMatch => ({
  id: "r5",
  date: "2026-03-01",
  car: "Renault 5",
  video: { id: "vid", start: "1:50", end: "2:20", title: "Titre publié" },
  rounds: [{ a: "pierre", b: "ciseaux" }],
  ...over,
});

const valid = (r: Review): Review => {
  r.rounds = [
    { a: "pierre", b: "pierre" },
    { a: "feuille", b: "pierre" },
  ];
  return r;
};

describe("temps", () => {
  it("lit et écrit les temps, NaN pour un texte mal formé", () => {
    expect(parseTime("1:02:03")).toBe(3723);
    expect(parseTime(" 12:34 ")).toBe(754);
    expect(parseTime("")).toBeNull();
    expect(parseTime("1h")).toBeNaN();
    expect(fmt(754.4)).toBe("12:34");
    expect(fmt(NaN)).toBe("");
  });
});

describe("guessCar", () => {
  it("devine la voiture d'après le titre", () => {
    expect(guessCar("Essai Cupra Raval : une bonne voiture ?")).toBe("Cupra Raval");
    expect(guessCar("Test autonomie Tesla Model Y (hiver)")).toBe("Tesla Model Y");
    expect(guessCar("Paris-Nice en Renault 5 ?")).toBe("Renault 5");
    expect(guessCar(null)).toBe("");
  });
});

describe("saisie", () => {
  it("une égalité en dernière manche ouvre la suivante", () => {
    const r = initialReview(cand(), []);
    pick(r, 0, "a", "pierre");
    expect(r.rounds).toHaveLength(1);
    pick(r, 0, "b", "pierre");
    expect(r.rounds).toHaveLength(2);
  });

  it("valide la voiture, les temps et les manches", () => {
    const r = initialReview(cand(), []);
    expect(validate(r)).toBe("Renseigne au moins une manche.");
    valid(r);
    expect(validate(r)).toBe("");
    expect(validate({ ...r, car: " " })).toBe("Indique la voiture.");
    expect(validate({ ...r, end: 50 })).toBe("Temps de fin invalide.");
    expect(validate({ ...r, rounds: [...r.rounds].reverse() })).toBe("Seule la dernière manche peut avoir un gagnant.");
  });
});

describe("export", () => {
  it("un nouveau duel validé est ajouté au format de shifumi.json", () => {
    const c = cand();
    const r = valid(initialReview(c, []));
    r.status = "ok";
    const items = toExport([c], () => r, []);
    expect(items).toEqual([
      {
        candidate: c,
        replace: false,
        entry: {
          id: "vid-100",
          date: "2026-03-01",
          car: "Renault 5",
          video: { id: "vid", start: "1:40", end: "2:20", title: c.title },
          rounds: [
            { a: "pierre", b: "pierre" },
            { a: "feuille", b: "pierre" },
          ],
        },
      },
    ]);
    expect(exportCode(items)).toContain('    "id": "vid-100"');
  });

  it("un duel déjà publié n'est réexporté que s'il a été modifié ici", () => {
    const c = cand();
    const matches = [published()];
    const r = initialReview(c, matches);
    expect(r).toMatchObject({ status: "done", car: "Renault 5", start: 110, end: 140 });
    expect(isEdited(c, r, matches)).toBe(false);
    r.car = "Renault 5 Turbo";
    expect(isEdited(c, r, matches)).toBe(true);
    const [item] = toExport([c], () => r, matches);
    expect(item).toMatchObject({ replace: true, entry: { id: "r5", car: "Renault 5 Turbo" } });
    expect(item!.entry.video.title).toBe("Titre publié");
  });

  it("entryOf omet la fin, l'enjeu et la note vides", () => {
    const c = cand({ end: null });
    const e = entryOf(c, valid(initialReview(c, [])), []);
    expect(e.video).not.toHaveProperty("end");
    expect(e).not.toHaveProperty("stake");
    expect(e).not.toHaveProperty("note");
  });
});

describe("syncWithFile", () => {
  it("un duel non touché ici reprend les valeurs du fichier", () => {
    const c = cand();
    const r = initialReview(c, [published()]);
    syncWithFile(r, c, [published({ car: "R5 Alpine" })]);
    expect(r.car).toBe("R5 Alpine");
    expect(r.conflict).toBeUndefined();
  });

  it("un duel modifié des deux côtés est en conflit", () => {
    const c = cand();
    const r = initialReview(c, [published()]);
    r.note = "modifié ici";
    syncWithFile(r, c, [published({ car: "R5 Alpine" })]);
    expect(r.conflict).toBe(true);
    expect(isEdited(c, r, [published({ car: "R5 Alpine" })])).toBe(false);
  });

  it("le statut suit le fichier", () => {
    const c = cand();
    const r = initialReview(c, []);
    syncWithFile(r, c, [published()]);
    expect(r.status).toBe("done");
    expect(r.base).toBe(fieldsKey(r));
    syncWithFile(r, c, []);
    expect(r.status).toBe("todo");
  });
});

describe("highlight", () => {
  it("met les mots-clés aux indices impairs", () => {
    expect(highlight("Bon, Chifoumi ! (a+b)", ["(a+b)"])).toEqual(["Bon, ", "Chifoumi", " ! ", "(a+b)", ""]);
  });
});
